/*
 * Copyright (c) 2022 SAP SE or an SAP affiliate company and XSK contributors
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Apache License, v2.0
 * which accompanies this distribution, and is available at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and XSK contributors
 * SPDX-License-Identifier: Apache-2.0
 */
var migrationLaunchView = angular.module("migration-launch", ["angularFileUpload"]);


migrationLaunchView.factory("$messageHub", [
    function () {
        var messageHub = new FramesMessageHub();
        var announceAlert = function (title, message, type) {
            messageHub.post(
                {
                    data: {
                        title: title,
                        message: message,
                        type: type,
                    },
                },
                "ide.alert"
            );
        };
        var announceAlertError = function (title, message) {
            announceAlert(title, message, "error");
        };
        var message = function (evtName, data) {
            messageHub.post({ data: data }, evtName);
        };
        var on = function (topic, callback) {
            messageHub.subscribe(callback, topic);
        };
        return {
            announceAlert: announceAlert,
            announceAlertError: announceAlertError,
            message: message,
            on: on,
        };
    },
]);

const FLOW_TYPE_ZIP = 1;
const FLOW_TYPE_LIVE = 2;

migrationLaunchView.factory("stepFactory", ['migrationViewState', function (migrationViewState) {
    const steps = [
        {
            id: 1,
            name: "SAP BTP Neo Credentials",
            topicId: "migration.neo-credentials"
        },
        {
            id: 2,
            name: "SAP HANA Credentials",
            topicId: "migration.hana-credentials",
            onLoad: "migration.get-databases"
        },
        { id: 3, name: "Delivery Units", topicId: "migration.delivery-unit", onLoad: "migration.delivery-unit" },
        { id: 4, name: "Changes", topicId: "migration.changes", onLoad: "migration.changes" },
        { id: 5, name: "Migration", topicId: "migration.start-migration", onLoad: "migration.start-migration" },
    ];

    const zipsteps = [
        { id: 1, name: "Upload ZIP file", topicId: "migration.upload-zip-migration" },
        { id: 2, name: "Migration", topicId: "migration.start-zip-migration" },
    ];

    function getStepByIndex(index) {
        const activeFlow = migrationViewState.getActiveFlow();
        return activeFlow === FLOW_TYPE_LIVE ? steps[index - 1] : zipsteps[index - 1]; //TODO: refactor - get by id instead index in array
    }

    function getStepByIndexForFlow(index, flow) {
        return flow === FLOW_TYPE_LIVE ? steps[index - 1] : zipsteps[index - 1];
    }

    function getSteps() {
        const activeFlow = migrationViewState.getActiveFlow();
        return activeFlow === FLOW_TYPE_LIVE ? steps : zipsteps;
    }

    return {
        getStepByIndex,
        getSteps,
        getStepByIndexForFlow
    }
}])

migrationLaunchView.factory("migrationDataState", migrationDataState);

function migrationDataState() {
    let state = {
        schemaName: null,
        dbUsername: null,
        dbPassword: null,

        neoUsername: null,
        neoPassword: null,
        neoSubaccount: null,
        neoHostName: null,

        selectedDeliveryUnits: [],
        selectedWorkspace: null,

        processInstanceId: null,
        connectionId: null,
    };

    return state;
}

migrationLaunchView.factory("migrationViewState", ["$messageHub", function ($messageHub) {
    let isDataLoading = false;
    let currentStepIndex = 0;
    let nextDisabled = true;
    let finishVisible = false;
    let nextVisible = true;

    let activeFlow = null;

    let defaultViewSettings = {
        fullWidthEnabled: false,
        bottomNavHidden: false,
        previousDisabled: false,
        nextDisabled: true,
        previousVisible: true,
        nextVisible: true,
        finishVisible: true,
        finishDisabled: true,
    }

    function setActiveFlow(type) {
        activeFlow = type;
    }

    function getActiveFlow() {
        return activeFlow;
    }

    function getDefaultState() {
        return defaultViewSettings;
    }

    function isFullWidthEnabled() {
        return defaultViewSettings.fullWidthEnabled;
    }

    function isBottomNavHidden() {
        return currentStepIndex === 0 || isDataLoading || currentStepIndex === 5 || currentStepIndex === 4;
    }

    function isPreviousDisabled() {
        return isDataLoading;
    }

    function isPreviousVisible() {
        return !isDataLoading && currentStepIndex > 0;
    }

    function isNextDisabled() {
        return nextDisabled;
    }

    function isNextVisible() {
        return nextVisible;
    }

    function setNextVisible(visible) {
        nextVisible = visible;
    }

    function isFinishDisabled() {
        return !isDataLoading;
    }

    function isFinishVisible() {
        return finishVisible;
    }

    function setFinishVisible(visible) {
        finishVisible = visible;
    }

    function isOnStatisticsPage() {
        return currentStepIndex === 0;
    }

    function setDataLoading(loading) {
        isDataLoading = loading;
    }

    function goForward() {
        currentStepIndex++;
    }

    function goBack() {
        currentStepIndex--;
    }

    function goToStep(index, flowType, step, data) {
        isPreviousVisible = false;
        currentStepIndex = index;
        activeFlow = flowType;
        $messageHub.message(step.onLoad, data);
    }

    function getCurrentStepIndex() {
        return currentStepIndex;
    }

    function setNextDisabled(disabled) {
        nextDisabled = disabled;
    }
    function getIsDataLoading() {
        return isDataLoading;
    }

    function getVisibleStep() {
        if (activeFlow === FLOW_TYPE_LIVE) {
            switch (getCurrentStepIndex()) {
                case 1:
                    return 'neo-credentials';

                case 2:
                    return 'hana-credentials';

                case 3:
                    return 'delivery-unit';

                case 4:
                    return 'changes';

                case 5:
                    return 'start-migration';

                default:
                    throw ("Step does not exist in flow");

            }
        }

        if (activeFlow === FLOW_TYPE_ZIP) {
            switch (getCurrentStepIndex()) {
                case 1:
                    return 'zip-migration';

                case 2:
                    return 'start-migration';

                default:
                    throw ("Step does not exist in flow");
            }
        }
    }

    return {
        getDefaultState,
        isFullWidthEnabled,
        isBottomNavHidden,
        isPreviousDisabled,
        isPreviousVisible,
        isNextDisabled,
        isNextVisible,
        isFinishDisabled,
        isFinishVisible,
        isOnStatisticsPage,
        goForward,
        goBack,
        getCurrentStepIndex,
        setNextDisabled,
        setDataLoading,
        getIsDataLoading,
        setActiveFlow,
        getActiveFlow,
        setFinishVisible,
        setNextVisible,
        getVisibleStep,
        goToStep
    };
}]);

migrationLaunchView.controller("MigrationLaunchViewController", [
    "$scope",
    "$messageHub",
    "migrationViewState",
    "stepFactory",
    function ($scope, $messageHub, migrationViewState, stepFactory) {

        $scope.defaultViewSettings = migrationViewState.getDefaultState();

        $scope.getSteps = function () {
            return stepFactory.getSteps();
        }

        $scope.isVisible = function (partial) {
            return migrationViewState.getVisibleStep() === partial;
        }

        $scope.fullWidthEnabled = function () {
            return migrationViewState.isFullWidthEnabled();
        }
        $scope.onStatisticsPage = function () {
            return migrationViewState.isOnStatisticsPage();
        }

        $scope.isMigrationFromZip = function () {
            return migrationViewState.getActiveFlow() === FLOW_TYPE_ZIP;
        }

        $scope.bottomNavHidden = function () {
            return migrationViewState.isBottomNavHidden();
        }
        $scope.previousDisabled = function () {
            return migrationViewState.isPreviousDisabled();
        }
        $scope.nextDisabled = function () {
            return migrationViewState.isNextDisabled();
        }
        $scope.previousVisible = function () {
            return migrationViewState.isPreviousVisible();
        }
        $scope.nextVisible = function () {
            return migrationViewState.isNextVisible();
        }
        $scope.finishVisible = function () {
            return migrationViewState.isFinishVisible();
        }
        $scope.finishDisabled = function () {
            return migrationViewState.isFinishDisabled();
        }

        $scope.currentStepIndex = function () {
            migrationViewState.getCurrentStepIndex();
        }

        $scope.goForward = function () {
            migrationViewState.goForward();
            //this below should be in migrationViewState factory
            const currentStep = stepFactory.getStepByIndex(migrationViewState.getCurrentStepIndex());
            if (currentStep && currentStep["onLoad"]) {
                $messageHub.message(currentStep["onLoad"]);
            }
        }

        $scope.goBack = function () {
            migrationViewState.goBack();
        }

        $scope.selectLiveMigration = function () {
            migrationViewState.setFinishVisible(false);
            $scope.startFlow(FLOW_TYPE_LIVE);
        }

        $scope.startFlow = function (flowType) {
            migrationViewState.setActiveFlow(flowType)
            migrationViewState.goForward();
        }

        $scope.selectZipMigration = function () {
            migrationViewState.setFinishVisible(false);
            migrationViewState.setNextVisible(false);
            $scope.startFlow(FLOW_TYPE_ZIP);
        };

        $scope.setNextEnabled = function (enabled) {
            migrationViewState.setNextDisabled(!enabled);
        };

        $scope.previousClicked = function () {
            migrationViewState.goBack();
        };

        $scope.getDiffClicked = function (status, processInstanceId) {
            if (status === "POPULATING_PROJECTS_EXECUTED") {
                const step = stepFactory.getStepByIndexForFlow(4, FLOW_TYPE_LIVE);
                migrationViewState.goToStep(4, FLOW_TYPE_LIVE, step, { processInstanceId });
            }
        }


        $scope.getStepStatus = function (stepId) {
            if (stepId === migrationViewState.getCurrentStepIndex()) {
                return "active";
            }
            if (stepId < migrationViewState.getCurrentStepIndex()) {
                return "done";
            }
            return "inactive";
        }

        $messageHub.on("migration.launch", function (msg) { }.bind(this));
    },
]);
