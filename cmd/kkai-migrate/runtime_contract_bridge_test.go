//go:build kkai_bridge

package main

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDescribeContractJSONUsesBridgeRuntime(t *testing.T) {
	output, err := describeContractJSON("postgres")
	require.NoError(t, err)
	require.JSONEq(t, `{"compatible_prefixes":{"9":"sha256:7b70b6ad1c313866b03877f73cbb758495bcb31f872b127e30f11ec8d8df2b4c"},"migration_kind":"none","migration_set_digest":"sha256:7b70b6ad1c313866b03877f73cbb758495bcb31f872b127e30f11ec8d8df2b4c","migration_target_version":9,"runtime_max_version":9,"runtime_min_version":9,"schema_management":"runtime"}`, output)
}
