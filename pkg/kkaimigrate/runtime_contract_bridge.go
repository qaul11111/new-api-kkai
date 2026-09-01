//go:build kkai_bridge

package kkaimigrate

const (
	RuntimeMinVersion      int64 = AuthenticationSchemaVersion
	RuntimeMaxVersion      int64 = AccountTypeSchemaVersion
	MigrationTargetVersion int64 = AuthenticationSchemaVersion

	RequiredRuntimeVersion int64 = RuntimeMinVersion
	MaxCompatibleVersion   int64 = RuntimeMaxVersion
)
