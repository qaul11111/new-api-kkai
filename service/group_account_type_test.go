package service

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
	"github.com/stretchr/testify/require"
)

func preserveGroupSettings(t *testing.T) {
	t.Helper()
	originalEnabled := setting.IsAccountTypeSegmentationEnabled()
	originalMapping := setting.AccountTypeGroupMapping2JSONString()
	originalUsableGroups := setting.UserUsableGroups2JSONString()
	t.Cleanup(func() {
		setting.SetAccountTypeSegmentationEnabled(originalEnabled)
		require.NoError(t, setting.UpdateAccountTypeGroupMappingByJSONString(originalMapping))
		require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(originalUsableGroups))
	})
}

func TestAccountTypeSegmentationDisabledPreservesLegacyGroups(t *testing.T) {
	preserveGroupSettings(t)
	setting.SetAccountTypeSegmentationEnabled(false)
	require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"default":"Default","vip":"VIP"}`))

	groups := GetUserUsableGroupsForProfile(UserAccessProfile{
		UserGroup:   "default",
		AccountType: common.AccountTypeBusiness,
	})
	require.Equal(t, map[string]string{"default": "Default", "vip": "VIP"}, groups)
}

func TestAccountTypeSegmentationIntersectsCompleteAllowlist(t *testing.T) {
	preserveGroupSettings(t)
	setting.SetAccountTypeSegmentationEnabled(true)
	require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(
		`{"default":"Default","consumer-models":"Consumer","business-models":"Business"}`,
	))
	require.NoError(t, setting.UpdateAccountTypeGroupMappingByJSONString(
		`{"consumer":{"default":"C default","consumer-models":"C models"},"business":{"business-models":"B models"}}`,
	))

	consumerGroups := GetUserUsableGroupsForProfile(UserAccessProfile{
		UserGroup:   "default",
		AccountType: common.AccountTypeConsumer,
	})
	require.Equal(t, map[string]string{"default": "C default", "consumer-models": "C models"}, consumerGroups)

	businessGroups := GetUserUsableGroupsForProfile(UserAccessProfile{
		UserGroup:   "default",
		AccountType: common.AccountTypeBusiness,
	})
	require.Equal(t, map[string]string{"business-models": "B models"}, businessGroups)
	require.False(t, GroupInUserUsableGroupsForProfile(
		UserAccessProfile{UserGroup: "default", AccountType: common.AccountTypeBusiness},
		"default",
	))
}

func TestAccountTypeSegmentationMissingMappingFailsClosed(t *testing.T) {
	preserveGroupSettings(t)
	setting.SetAccountTypeSegmentationEnabled(true)
	require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"default":"Default"}`))
	require.NoError(t, setting.UpdateAccountTypeGroupMappingByJSONString(`{"consumer":{"default":"Default"}}`))

	require.Empty(t, GetUserUsableGroupsForProfile(UserAccessProfile{
		UserGroup:   "default",
		AccountType: common.AccountTypeBusiness,
	}))
}

func TestUnknownAccountTypeFailsClosedToConsumerPolicy(t *testing.T) {
	preserveGroupSettings(t)
	setting.SetAccountTypeSegmentationEnabled(true)
	require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"default":"Default","business":"Business"}`))
	require.NoError(t, setting.UpdateAccountTypeGroupMappingByJSONString(
		`{"consumer":{"default":"Default"},"business":{"business":"Business"}}`,
	))

	groups := GetUserUsableGroupsForProfile(UserAccessProfile{UserGroup: "default", AccountType: "corrupt"})
	require.Equal(t, map[string]string{"default": "Default"}, groups)
}
