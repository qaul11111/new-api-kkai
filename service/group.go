package service

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/gin-gonic/gin"
)

type UserAccessProfile struct {
	UserGroup   string
	AccountType string
}

func GetUserUsableGroups(userGroup string) map[string]string {
	groupsCopy := setting.GetUserUsableGroupsCopy()
	if userGroup != "" {
		specialSettings, b := ratio_setting.GetGroupRatioSetting().GroupSpecialUsableGroup.Get(userGroup)
		if b {
			// 处理特殊可用分组
			for specialGroup, desc := range specialSettings {
				if strings.HasPrefix(specialGroup, "-:") {
					// 移除分组
					groupToRemove := strings.TrimPrefix(specialGroup, "-:")
					delete(groupsCopy, groupToRemove)
				} else if strings.HasPrefix(specialGroup, "+:") {
					// 添加分组
					groupToAdd := strings.TrimPrefix(specialGroup, "+:")
					groupsCopy[groupToAdd] = desc
				} else {
					// 直接添加分组
					groupsCopy[specialGroup] = desc
				}
			}
		}
		// 如果userGroup不在UserUsableGroups中，返回UserUsableGroups + userGroup
		if _, ok := groupsCopy[userGroup]; !ok {
			groupsCopy[userGroup] = "用户分组"
		}
	}
	return groupsCopy
}

func GroupInUserUsableGroups(userGroup, groupName string) bool {
	_, ok := GetUserUsableGroups(userGroup)[groupName]
	return ok
}

// GetUserUsableGroupsForProfile applies the legacy group expansion first and
// then intersects it with the account-type allowlist. When segmentation is
// enabled, a missing or empty mapping intentionally grants no model groups.
func GetUserUsableGroupsForProfile(profile UserAccessProfile) map[string]string {
	legacyGroups := GetUserUsableGroups(profile.UserGroup)
	if !setting.IsAccountTypeSegmentationEnabled() {
		return legacyGroups
	}

	allowed := setting.GetAccountTypeAllowedGroups(common.EffectiveAccountType(profile.AccountType))
	groups := make(map[string]string)
	for group, configuredDescription := range allowed {
		legacyDescription, usable := legacyGroups[group]
		if !usable {
			continue
		}
		if strings.TrimSpace(configuredDescription) != "" {
			groups[group] = configuredDescription
		} else {
			groups[group] = legacyDescription
		}
	}
	return groups
}

func GroupInUserUsableGroupsForProfile(profile UserAccessProfile, groupName string) bool {
	_, ok := GetUserUsableGroupsForProfile(profile)[groupName]
	return ok
}

func SetUserAccessProfileContext(c *gin.Context, profile UserAccessProfile) {
	if c == nil {
		return
	}
	profile.AccountType = common.EffectiveAccountType(profile.AccountType)
	common.SetContextKey(c, constant.ContextKeyUserAccountType, profile.AccountType)
	common.SetContextKey(c, constant.ContextKeyUserUsableGroups, GetUserUsableGroupsForProfile(profile))
}

func UserAccessProfileFromContext(c *gin.Context) UserAccessProfile {
	if c == nil {
		return UserAccessProfile{AccountType: common.AccountTypeConsumer}
	}
	return UserAccessProfile{
		UserGroup:   common.GetContextKeyString(c, constant.ContextKeyUserGroup),
		AccountType: common.EffectiveAccountType(common.GetContextKeyString(c, constant.ContextKeyUserAccountType)),
	}
}

func UserUsableGroupsFromContext(c *gin.Context) map[string]string {
	if groups, ok := common.GetContextKeyType[map[string]string](c, constant.ContextKeyUserUsableGroups); ok {
		copyGroups := make(map[string]string, len(groups))
		for group, description := range groups {
			copyGroups[group] = description
		}
		return copyGroups
	}
	return GetUserUsableGroupsForProfile(UserAccessProfileFromContext(c))
}

// GetUserAutoGroup 根据用户分组获取自动分组设置
func GetUserAutoGroup(userGroup string) []string {
	groups := GetUserUsableGroups(userGroup)
	autoGroups := make([]string, 0)
	for _, group := range setting.GetAutoGroups() {
		if _, ok := groups[group]; ok {
			autoGroups = append(autoGroups, group)
		}
	}
	return autoGroups
}

func GetUserAutoGroupForProfile(profile UserAccessProfile) []string {
	groups := GetUserUsableGroupsForProfile(profile)
	autoGroups := make([]string, 0)
	for _, group := range setting.GetAutoGroups() {
		if _, ok := groups[group]; ok {
			autoGroups = append(autoGroups, group)
		}
	}
	return autoGroups
}

// GetUserGroupRatio 获取用户使用某个分组的倍率
// userGroup 用户分组
// group 需要获取倍率的分组
func GetUserGroupRatio(userGroup, group string) float64 {
	ratio, ok := ratio_setting.GetGroupGroupRatio(userGroup, group)
	if ok {
		return ratio
	}
	return ratio_setting.GetGroupRatio(group)
}
