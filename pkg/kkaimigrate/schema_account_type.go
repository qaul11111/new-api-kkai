package kkaimigrate

import (
	"fmt"

	"gorm.io/gorm"
)

const (
	accountTypeConsumer = "consumer"
	accountTypeBusiness = "business"
)

var accountTypeSchemaStatements = map[string][]migrationStatement{
	DialectSQLite: {
		{Operation: migrationOperationAddNullableColumn, SQL: `ALTER TABLE users ADD COLUMN account_type VARCHAR(16)`},
	},
	DialectMySQL: {
		{Operation: migrationOperationAddNullableColumn, SQL: `ALTER TABLE users ADD COLUMN account_type VARCHAR(16)`},
	},
	DialectPostgres: {
		{Operation: migrationOperationAddNullableColumn, SQL: `ALTER TABLE users ADD COLUMN account_type VARCHAR(16)`},
	},
}

func backfillAccountTypeSchema(tx *gorm.DB) error {
	if tx == nil {
		return ErrSchemaNotReady
	}
	if err := tx.Exec(`UPDATE users
SET account_type = ?
WHERE account_type IS NULL OR TRIM(account_type) = ''`, accountTypeConsumer).Error; err != nil {
		return fmt.Errorf("initialize users.account_type: %w", err)
	}
	return nil
}

var accountTypeRuntimeSchemaRequirements = []runtimeSchemaRequirement{
	{Table: "users", Columns: []string{"account_type"}},
}

func validateAccountTypeRuntimeSchema(db *gorm.DB) error {
	var invalidAccountTypes int64
	if err := db.Table("users").
		Where("account_type IS NULL OR TRIM(account_type) NOT IN (?, ?)", accountTypeConsumer, accountTypeBusiness).
		Count(&invalidAccountTypes).Error; err != nil {
		return fmt.Errorf("validate users.account_type backfill: %w", err)
	}
	if invalidAccountTypes != 0 {
		return fmt.Errorf("%w: users.account_type contains invalid values", ErrSchemaNotReady)
	}
	return nil
}
