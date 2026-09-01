package controller

import (
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

var getKKAIUserGroup = model.GetUserGroup

func GetKKAIGroupStatus(c *gin.Context) {
	hours := 24
	if rawHours := c.Query("hours"); rawHours != "" {
		if parsed, err := strconv.Atoi(rawHours); err == nil {
			hours = parsed
		}
	}

	userGroup, err := getKKAIUserGroup(c.GetInt("id"), false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	profile := service.UserAccessProfile{
		UserGroup:   userGroup,
		AccountType: common.GetContextKeyString(c, constant.ContextKeyUserAccountType),
	}
	result, err := service.GetKKAIGroupStatuses(service.KKAIGroupStatusRequest{
		UsableGroups: service.GetUserUsableGroupsForProfile(profile),
		AutoGroups:   service.GetUserAutoGroupForProfile(profile),
		Hours:        hours,
		Window:       c.Query("window"),
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, result)
}
