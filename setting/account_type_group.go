package setting

import (
	"fmt"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
)

const (
	AccountTypeSegmentationEnabledOptionKey = "AccountTypeSegmentationEnabled"
	AccountTypeGroupMappingOptionKey        = "AccountTypeGroupMapping"
)

var accountTypeGroupConfig = struct {
	sync.RWMutex
	enabled bool
	mapping map[string]map[string]string
}{
	mapping: map[string]map[string]string{
		common.AccountTypeConsumer: {},
		common.AccountTypeBusiness: {},
	},
}

func IsAccountTypeSegmentationEnabled() bool {
	accountTypeGroupConfig.RLock()
	defer accountTypeGroupConfig.RUnlock()
	return accountTypeGroupConfig.enabled
}

func SetAccountTypeSegmentationEnabled(enabled bool) {
	accountTypeGroupConfig.Lock()
	accountTypeGroupConfig.enabled = enabled
	accountTypeGroupConfig.Unlock()
}

func GetAccountTypeGroupMappingCopy() map[string]map[string]string {
	accountTypeGroupConfig.RLock()
	defer accountTypeGroupConfig.RUnlock()
	return copyAccountTypeGroupMapping(accountTypeGroupConfig.mapping)
}

func GetAccountTypeAllowedGroups(accountType string) map[string]string {
	mapping := GetAccountTypeGroupMappingCopy()
	return mapping[common.EffectiveAccountType(accountType)]
}

func AccountTypeGroupMapping2JSONString() string {
	mapping := GetAccountTypeGroupMappingCopy()
	data, err := common.Marshal(mapping)
	if err != nil {
		common.SysLog("error marshalling account type group mapping: " + err.Error())
		return "{}"
	}
	return string(data)
}

func ValidateAccountTypeGroupMappingJSON(value string) error {
	_, err := parseAccountTypeGroupMapping(value)
	return err
}

func UpdateAccountTypeGroupMappingByJSONString(value string) error {
	mapping, err := parseAccountTypeGroupMapping(value)
	if err != nil {
		return err
	}
	accountTypeGroupConfig.Lock()
	accountTypeGroupConfig.mapping = mapping
	accountTypeGroupConfig.Unlock()
	return nil
}

func parseAccountTypeGroupMapping(value string) (map[string]map[string]string, error) {
	var mapping map[string]map[string]string
	if err := common.Unmarshal([]byte(value), &mapping); err != nil {
		return nil, fmt.Errorf("invalid account type group mapping: %w", err)
	}
	if mapping == nil {
		return nil, fmt.Errorf("account type group mapping must be an object")
	}
	for accountType, groups := range mapping {
		if accountType != common.AccountTypeConsumer && accountType != common.AccountTypeBusiness {
			return nil, fmt.Errorf("unknown account type %q", accountType)
		}
		if groups == nil {
			mapping[accountType] = map[string]string{}
			continue
		}
		for group, description := range groups {
			canonicalGroup := strings.TrimSpace(group)
			if canonicalGroup == "" || canonicalGroup != group {
				return nil, fmt.Errorf("account type %s contains an invalid group name", accountType)
			}
			if strings.TrimSpace(description) == "" {
				groups[group] = group
			}
		}
	}
	if _, ok := mapping[common.AccountTypeConsumer]; !ok {
		mapping[common.AccountTypeConsumer] = map[string]string{}
	}
	if _, ok := mapping[common.AccountTypeBusiness]; !ok {
		mapping[common.AccountTypeBusiness] = map[string]string{}
	}
	return copyAccountTypeGroupMapping(mapping), nil
}

func copyAccountTypeGroupMapping(source map[string]map[string]string) map[string]map[string]string {
	result := make(map[string]map[string]string, len(source))
	for accountType, groups := range source {
		groupsCopy := make(map[string]string, len(groups))
		for group, description := range groups {
			groupsCopy[group] = description
		}
		result[accountType] = groupsCopy
	}
	return result
}
