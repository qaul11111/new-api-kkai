package setting

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/require"
)

func TestUpdateAccountTypeGroupMappingUsesDefensiveCopies(t *testing.T) {
	original := AccountTypeGroupMapping2JSONString()
	t.Cleanup(func() { require.NoError(t, UpdateAccountTypeGroupMappingByJSONString(original)) })

	require.NoError(t, UpdateAccountTypeGroupMappingByJSONString(
		`{"consumer":{"default":"C 端"},"business":{"enterprise":"B 端"}}`,
	))
	copyOne := GetAccountTypeGroupMappingCopy()
	copyOne[common.AccountTypeConsumer]["default"] = "changed"
	copyOne[common.AccountTypeBusiness]["extra"] = "extra"

	copyTwo := GetAccountTypeGroupMappingCopy()
	require.Equal(t, "C 端", copyTwo[common.AccountTypeConsumer]["default"])
	require.NotContains(t, copyTwo[common.AccountTypeBusiness], "extra")
}

func TestValidateAccountTypeGroupMappingRejectsUnknownTypesAndInvalidGroups(t *testing.T) {
	require.Error(t, ValidateAccountTypeGroupMappingJSON(`{"partner":{"default":"Partner"}}`))
	require.Error(t, ValidateAccountTypeGroupMappingJSON(`{"consumer":{" bad ":"Bad"}}`))
	require.Error(t, ValidateAccountTypeGroupMappingJSON(`null`))
}

func TestMissingAccountTypeMappingBecomesEmptyAllowlist(t *testing.T) {
	original := AccountTypeGroupMapping2JSONString()
	t.Cleanup(func() { require.NoError(t, UpdateAccountTypeGroupMappingByJSONString(original)) })

	require.NoError(t, UpdateAccountTypeGroupMappingByJSONString(`{"consumer":{"default":"C 端"}}`))
	mapping := GetAccountTypeGroupMappingCopy()
	require.Empty(t, mapping[common.AccountTypeBusiness])
}
