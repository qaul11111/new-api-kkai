//go:build !kkai_bridge

package kkaimigrate

const (
	RuntimeMinVersion      int64 = AccountTypeSchemaVersion
	RuntimeMaxVersion      int64 = AccountTypeSchemaVersion
	MigrationTargetVersion int64 = AccountTypeSchemaVersion

	RequiredRuntimeVersion int64 = RuntimeMinVersion
	MaxCompatibleVersion   int64 = RuntimeMaxVersion
)
