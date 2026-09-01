package kkaimigrate

import (
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestAccountTypeV9DefinesOnlyAdditiveColumnForEveryDialect(t *testing.T) {
	for _, dialect := range []string{DialectSQLite, DialectMySQL, DialectPostgres} {
		t.Run(dialect, func(t *testing.T) {
			statements := accountTypeSchemaStatements[dialect]
			require.Len(t, statements, 1)
			require.Equal(t, migrationOperationAddNullableColumn, statements[0].Operation)
			upper := strings.ToUpper(statements[0].SQL)
			require.Contains(t, upper, "ALTER TABLE USERS ADD COLUMN ACCOUNT_TYPE VARCHAR(16)")
			require.NotContains(t, upper, "DROP ")
		})
	}
}

func TestApplyAccountTypeExpandBackfillsLegacyUsersAndIsIdempotent(t *testing.T) {
	db := newMigrationTestDB(t)
	_, err := applyThroughVersion(
		context.Background(), db, Options{}, AuthenticationSchemaVersion, AccountTypeSchemaVersion,
	)
	require.NoError(t, err)
	require.NoError(t, db.Exec("INSERT INTO users (id, telegram_id, auth_version) VALUES (?, ?, ?)", 91, "", 1).Error)
	require.False(t, db.Migrator().HasColumn("users", "account_type"))

	result, err := ApplyAccountTypeExpand(context.Background(), db, Options{})
	require.NoError(t, err)
	require.Len(t, result.Applied, int(AccountTypeSchemaVersion))
	require.Empty(t, result.Pending)

	var accountType string
	require.NoError(t, db.Table("users").Select("account_type").Where("id = ?", 91).Scan(&accountType).Error)
	require.Equal(t, accountTypeConsumer, accountType)
	require.NoError(t, CheckRequired(context.Background(), db))

	second, err := ApplyAccountTypeExpand(context.Background(), db, Options{})
	require.NoError(t, err)
	require.Len(t, second.Applied, int(AccountTypeSchemaVersion))
}

func TestAccountTypeRuntimeSchemaRejectsUnknownValue(t *testing.T) {
	db := newMigrationTestDB(t)
	_, err := applyThroughVersion(
		context.Background(), db, Options{}, AccountTypeSchemaVersion, AccountTypeSchemaVersion,
	)
	require.NoError(t, err)
	require.NoError(t, db.Exec(
		"INSERT INTO users (id, telegram_id, auth_version, account_type) VALUES (?, ?, ?, ?)",
		92, "", 1, "partner",
	).Error)

	err = checkThroughVersion(
		context.Background(), db, AccountTypeSchemaVersion, AccountTypeSchemaVersion, AccountTypeSchemaVersion,
	)
	require.ErrorIs(t, err, ErrSchemaNotReady)
	require.ErrorContains(t, err, "users.account_type")
}

func TestBackfillAccountTypeSchemaInitializesNullAndEmptyValues(t *testing.T) {
	db := newMigrationTestDB(t)
	for _, statement := range accountTypeSchemaStatements[DialectSQLite] {
		require.NoError(t, executeMigrationStatement(db, DialectSQLite, statement))
	}
	require.NoError(t, db.Exec(`INSERT INTO users (id, telegram_id, account_type) VALUES
(101, '', NULL),
(102, '', ''),
(103, '', ?)`, accountTypeBusiness).Error)

	require.NoError(t, db.Transaction(backfillAccountTypeSchema))

	var values []string
	require.NoError(t, db.Table("users").Order("id").Pluck("account_type", &values).Error)
	require.Equal(t, []string{accountTypeConsumer, accountTypeConsumer, accountTypeBusiness}, values)
}
