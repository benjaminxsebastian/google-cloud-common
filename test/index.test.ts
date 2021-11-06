/*
 * Created on Mon Oct 11 2021
 *
 * Copyright [2021] [Benjamin Sebastian]
 *
 *Licensed under the Apache License, Version 2.0 (the "License");
 *you may not use this file except in compliance with the License.
 *You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *Unless required by applicable law or agreed to in writing, software
 *distributed under the License is distributed on an "AS IS" BASIS,
 *WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *See the License for the specific language governing permissions and
 *limitations under the License.
 *
 */

const mockGetProjectId = jest.fn();
const mockEnableService = jest.fn();
const mockListBillingAccounts = jest.fn();

import { v4 as uuidV4 } from 'uuid';
import { protos as serviceUsageProtos } from '@google-cloud/service-usage';
import {
    protos as billingProtos,
    CloudBillingClient
} from '@google-cloud/billing';
import {
    CLOUD_BILLING_API,
    getProjectIdentifier,
    enableServiceForProject,
    initializeServiceAPIForProject,
    validateCloudBillingAccount,
    initializeGoogleCloudCommon
} from '../src/index';

jest.mock('@google-cloud/service-usage', () => {
    const originalModule = jest.requireActual('@google-cloud/service-usage');

    return {
        ...originalModule,
        ServiceUsageClient: jest.fn(() => {
            return {
                getProjectId: mockGetProjectId,
                enableService: mockEnableService
            };
        })
    };
});

jest.mock('@google-cloud/billing', () => {
    const originalModule = jest.requireActual('@google-cloud/billing');

    return {
        ...originalModule,
        CloudBillingClient: jest.fn(() => {
            return {
                listBillingAccounts: mockListBillingAccounts
            };
        })
    };
});

describe('Test functions in index: ', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetProjectId.mockClear();
        mockEnableService.mockClear();
        mockListBillingAccounts.mockClear();
    });

    function createEnableServiceResponse(
        projectIdentifier: string,
        serviceName: string,
        enabled?: boolean
    ): serviceUsageProtos.google.api.serviceusage.v1.EnableServiceResponse {
        const testService =
            new serviceUsageProtos.google.api.serviceusage.v1.Service();

        testService.name = `projects/${projectIdentifier}/services/${serviceName}`;
        testService.parent = `projects/${projectIdentifier}`;
        if (enabled === undefined) {
            testService.state =
                serviceUsageProtos.google.api.serviceusage.v1.State.STATE_UNSPECIFIED;
        } else if (enabled) {
            testService.state =
                serviceUsageProtos.google.api.serviceusage.v1.State.ENABLED;
        } else {
            testService.state =
                serviceUsageProtos.google.api.serviceusage.v1.State.DISABLED;
        }
        const enableServiceResponse =
            new serviceUsageProtos.google.api.serviceusage.v1.EnableServiceResponse();

        enableServiceResponse.service = testService;

        return enableServiceResponse;
    }

    function createTestBillingAccount(
        open: boolean,
        masterBillingAccount: string
    ): billingProtos.google.cloud.billing.v1.BillingAccount {
        const testBillingAccount =
            new billingProtos.google.cloud.billing.v1.BillingAccount();

        testBillingAccount.name = `billingAccounts/${uuidV4()}`;
        testBillingAccount.open = open;
        testBillingAccount.displayName = `My Billing Account - ${uuidV4()}`;
        testBillingAccount.masterBillingAccount = masterBillingAccount;

        return testBillingAccount;
    }

    describe('Testing getProjectIdentifier(): ', () => {
        test('projectIdentifier undefined', async () => {
            mockGetProjectId.mockResolvedValueOnce(undefined);

            await expect(getProjectIdentifier()).rejects.toThrow(
                'The project identifier could NOT be obtained!'
            );

            expect(mockGetProjectId).toBeCalledTimes(1);
        });

        test('projectIdentifier defined', async () => {
            const TEST_PROJECT_IDENTIFIER = `test-project-id-${uuidV4()}`;

            mockGetProjectId.mockResolvedValueOnce(TEST_PROJECT_IDENTIFIER);

            await expect(getProjectIdentifier()).resolves.not.toThrow();

            expect(mockGetProjectId).toBeCalledTimes(1);
        });

        afterEach(() => {
            expect(mockEnableService).not.toHaveBeenCalled();
            expect(mockListBillingAccounts).not.toHaveBeenCalled();
        });
    });

    describe('Testing enableServiceForProject(): ', () => {
        test('projectIdentifier undefined, serviceName undefined', async () => {
            const TEST_PROJECT_IDENTIFIER = `test-project-id-${uuidV4()}`;
            const TEST_SERVICE_NAME = `test-service-${uuidV4()}.googleapis.com`;
            const ENABLE_SERVICE_REQUEST_SERVICE_NAME = `projects/${TEST_PROJECT_IDENTIFIER}/services/${TEST_SERVICE_NAME}`;

            mockGetProjectId.mockResolvedValueOnce(TEST_PROJECT_IDENTIFIER);
            const testService =
                new serviceUsageProtos.google.api.serviceusage.v1.Service();
            const enableServiceResponse =
                new serviceUsageProtos.google.api.serviceusage.v1.EnableServiceResponse();

            enableServiceResponse.service = testService;
            const mockEnableServiceResponsePromise = jest.fn();

            mockEnableServiceResponsePromise.mockResolvedValueOnce([
                enableServiceResponse
            ]);
            mockEnableService.mockResolvedValueOnce([
                {
                    promise: mockEnableServiceResponsePromise
                }
            ]);

            await expect(
                enableServiceForProject(TEST_SERVICE_NAME)
            ).rejects.toThrow(
                `The service name in enableServiceResponse: ${enableServiceResponse.service?.name} does NOT match the service name in enableServiceRequest: ${ENABLE_SERVICE_REQUEST_SERVICE_NAME}!`
            );

            expect(mockGetProjectId).toHaveBeenCalledTimes(1);
            expect(mockEnableService).toHaveBeenCalledTimes(1);
            expect(mockEnableService.mock.calls[0][0].name).toBe(
                ENABLE_SERVICE_REQUEST_SERVICE_NAME
            );
            expect(mockEnableServiceResponsePromise).toHaveBeenCalledTimes(1);
        });

        test('projectIdentifier defined, serviceName does not match', async () => {
            const TEST_PROJECT_IDENTIFIER = `test-project-id-${uuidV4()}`;
            const TEST_SERVICE_NAME = `test-service-${uuidV4()}.googleapis.com`;
            const ENABLE_SERVICE_REQUEST_SERVICE_NAME = `projects/${TEST_PROJECT_IDENTIFIER}/services/${TEST_SERVICE_NAME}`;

            const enableServiceResponse = createEnableServiceResponse(
                TEST_PROJECT_IDENTIFIER,
                'different-service.googleapis.com',
                true
            );
            const mockEnableServiceResponsePromise = jest.fn();

            mockEnableServiceResponsePromise.mockResolvedValueOnce([
                enableServiceResponse
            ]);
            mockEnableService.mockResolvedValueOnce([
                {
                    promise: mockEnableServiceResponsePromise
                }
            ]);

            await expect(
                enableServiceForProject(
                    TEST_SERVICE_NAME,
                    TEST_PROJECT_IDENTIFIER
                )
            ).rejects.toThrow(
                `The service name in enableServiceResponse: ${enableServiceResponse.service?.name} does NOT match the service name in enableServiceRequest: ${ENABLE_SERVICE_REQUEST_SERVICE_NAME}!`
            );

            expect(mockGetProjectId).not.toHaveBeenCalled();
            expect(mockEnableService).toHaveBeenCalledTimes(1);
            expect(mockEnableService.mock.calls[0][0].name).toBe(
                ENABLE_SERVICE_REQUEST_SERVICE_NAME
            );
            expect(mockEnableServiceResponsePromise).toHaveBeenCalledTimes(1);
        });

        test('projectIdentifier defined, service not enabled', async () => {
            const TEST_PROJECT_IDENTIFIER = `test-project-id-${uuidV4()}`;
            const TEST_SERVICE_NAME = `test-service-${uuidV4()}.googleapis.com`;
            const ENABLE_SERVICE_REQUEST_SERVICE_NAME = `projects/${TEST_PROJECT_IDENTIFIER}/services/${TEST_SERVICE_NAME}`;

            const enableServiceResponse = createEnableServiceResponse(
                TEST_PROJECT_IDENTIFIER,
                TEST_SERVICE_NAME
            );
            const mockEnableServiceResponsePromise = jest.fn();

            mockEnableServiceResponsePromise.mockResolvedValueOnce([
                enableServiceResponse
            ]);
            mockEnableService.mockResolvedValueOnce([
                {
                    promise: mockEnableServiceResponsePromise
                }
            ]);

            await expect(
                enableServiceForProject(
                    TEST_SERVICE_NAME,
                    TEST_PROJECT_IDENTIFIER
                )
            ).rejects.toThrow(
                `The service: ${ENABLE_SERVICE_REQUEST_SERVICE_NAME} could NOT be enabled successfully. Current state: ${serviceUsageProtos.google.api.serviceusage.v1.State.STATE_UNSPECIFIED}.`
            );

            expect(mockGetProjectId).not.toHaveBeenCalled();
            expect(mockEnableService).toHaveBeenCalledTimes(1);
            expect(mockEnableService.mock.calls[0][0].name).toBe(
                ENABLE_SERVICE_REQUEST_SERVICE_NAME
            );
            expect(mockEnableServiceResponsePromise).toHaveBeenCalledTimes(1);
        });

        test('projectIdentifier defined, service undefined', async () => {
            const TEST_PROJECT_IDENTIFIER = `test-project-id-${uuidV4()}`;
            const TEST_SERVICE_NAME = `test-service-${uuidV4()}.googleapis.com`;
            const ENABLE_SERVICE_REQUEST_SERVICE_NAME = `projects/${TEST_PROJECT_IDENTIFIER}/services/${TEST_SERVICE_NAME}`;

            const enableServiceResponse =
                new serviceUsageProtos.google.api.serviceusage.v1.EnableServiceResponse();
            const mockEnableServiceResponsePromise = jest.fn();

            mockEnableServiceResponsePromise.mockResolvedValueOnce([
                enableServiceResponse
            ]);
            mockEnableService.mockResolvedValueOnce([
                {
                    promise: mockEnableServiceResponsePromise
                }
            ]);

            await expect(
                enableServiceForProject(
                    TEST_SERVICE_NAME,
                    TEST_PROJECT_IDENTIFIER
                )
            ).rejects.toThrow(
                `The service: ${ENABLE_SERVICE_REQUEST_SERVICE_NAME} could NOT be enabled.`
            );

            expect(mockGetProjectId).not.toHaveBeenCalled();
            expect(mockEnableService).toHaveBeenCalledTimes(1);
            expect(mockEnableService.mock.calls[0][0].name).toBe(
                ENABLE_SERVICE_REQUEST_SERVICE_NAME
            );
            expect(mockEnableServiceResponsePromise).toHaveBeenCalledTimes(1);
        });

        test('projectIdentifier defined, service defined', async () => {
            const TEST_PROJECT_IDENTIFIER = `test-project-id-${uuidV4()}`;
            const TEST_SERVICE_NAME = `test-service-${uuidV4()}.googleapis.com`;
            const ENABLE_SERVICE_REQUEST_SERVICE_NAME = `projects/${TEST_PROJECT_IDENTIFIER}/services/${TEST_SERVICE_NAME}`;

            const enableServiceResponse = createEnableServiceResponse(
                TEST_PROJECT_IDENTIFIER,
                TEST_SERVICE_NAME,
                true
            );
            const mockEnableServiceResponsePromise = jest.fn();

            mockEnableServiceResponsePromise.mockResolvedValueOnce([
                enableServiceResponse
            ]);
            mockEnableService.mockResolvedValueOnce([
                {
                    promise: mockEnableServiceResponsePromise
                }
            ]);

            await expect(
                enableServiceForProject(
                    TEST_SERVICE_NAME,
                    TEST_PROJECT_IDENTIFIER
                )
            ).resolves.not.toThrow();

            expect(mockGetProjectId).not.toHaveBeenCalled();
            expect(mockEnableService).toHaveBeenCalledTimes(1);
            expect(mockEnableService.mock.calls[0][0].name).toBe(
                ENABLE_SERVICE_REQUEST_SERVICE_NAME
            );
            expect(mockEnableServiceResponsePromise).toHaveBeenCalledTimes(1);
        });

        afterEach(() => {
            expect(mockListBillingAccounts).not.toHaveBeenCalled();
        });
    });

    describe('Testing initializeServiceAPIForProject(): ', () => {
        test('projectIdentifier undefined', async () => {
            const TEST_PROJECT_IDENTIFIER = `test-project-id-${uuidV4()}`;
            const TEST_SERVICE_NAME = `test-service-${uuidV4()}.googleapis.com`;
            const ENABLE_SERVICE_REQUEST_SERVICE_NAME = `projects/${TEST_PROJECT_IDENTIFIER}/services/${TEST_SERVICE_NAME}`;

            const mockApi = jest.fn();
            mockGetProjectId.mockResolvedValueOnce(TEST_PROJECT_IDENTIFIER);
            const enableServiceResponse = createEnableServiceResponse(
                TEST_PROJECT_IDENTIFIER,
                TEST_SERVICE_NAME,
                true
            );
            const mockEnableServiceResponsePromise = jest.fn();

            mockEnableServiceResponsePromise.mockResolvedValueOnce([
                enableServiceResponse
            ]);
            mockEnableService.mockResolvedValueOnce([
                {
                    promise: mockEnableServiceResponsePromise
                }
            ]);

            await expect(
                initializeServiceAPIForProject(TEST_SERVICE_NAME, mockApi)
            ).resolves.not.toThrow();

            expect(mockGetProjectId).toHaveBeenCalledTimes(1);
            expect(mockEnableService).toHaveBeenCalledTimes(1);
            expect(mockEnableService.mock.calls[0][0].name).toBe(
                ENABLE_SERVICE_REQUEST_SERVICE_NAME
            );
            expect(mockEnableServiceResponsePromise).toHaveBeenCalledTimes(1);
            expect(mockApi.mock.instances.length).toBe(1);
        });

        test('projectIdentifier defined', async () => {
            const TEST_PROJECT_IDENTIFIER = `test-project-id-${uuidV4()}`;
            const TEST_SERVICE_NAME = `test-service-${uuidV4()}.googleapis.com`;
            const ENABLE_SERVICE_REQUEST_SERVICE_NAME = `projects/${TEST_PROJECT_IDENTIFIER}/services/${TEST_SERVICE_NAME}`;

            const mockApi = jest.fn();
            const enableServiceResponse = createEnableServiceResponse(
                TEST_PROJECT_IDENTIFIER,
                TEST_SERVICE_NAME,
                true
            );
            const mockEnableServiceResponsePromise = jest.fn();

            mockEnableServiceResponsePromise.mockResolvedValueOnce([
                enableServiceResponse
            ]);
            mockEnableService.mockResolvedValueOnce([
                {
                    promise: mockEnableServiceResponsePromise
                }
            ]);

            await expect(
                initializeServiceAPIForProject(
                    TEST_SERVICE_NAME,
                    mockApi,
                    TEST_PROJECT_IDENTIFIER
                )
            ).resolves.not.toThrow();

            expect(mockGetProjectId).not.toHaveBeenCalled();
            expect(mockEnableService).toHaveBeenCalledTimes(1);
            expect(mockEnableService.mock.calls[0][0].name).toBe(
                ENABLE_SERVICE_REQUEST_SERVICE_NAME
            );
            expect(mockEnableServiceResponsePromise).toHaveBeenCalledTimes(1);
            expect(mockApi.mock.instances.length).toBe(1);
        });

        afterEach(() => {
            expect(mockListBillingAccounts).not.toHaveBeenCalled();
        });
    });

    describe('Testing validateCloudBillingAccount(): ', () => {
        test('cloudBillingClient undefined, no masterCloudBillingAccount', async () => {
            const TEST_MASTER_BILLING_ACCOUNT = `testMasterBillingAccount-${uuidV4()}`;

            const testListBillingAccountsResponse =
                new billingProtos.google.cloud.billing.v1.ListBillingAccountsResponse();
            const testBillingAccounts: billingProtos.google.cloud.billing.v1.BillingAccount[] =
                [];

            testBillingAccounts.push(
                createTestBillingAccount(true, TEST_MASTER_BILLING_ACCOUNT)
            );
            testBillingAccounts.push(
                createTestBillingAccount(false, TEST_MASTER_BILLING_ACCOUNT)
            );
            testListBillingAccountsResponse.billingAccounts =
                testBillingAccounts;
            mockListBillingAccounts.mockResolvedValueOnce([
                testBillingAccounts,
                null,
                testListBillingAccountsResponse
            ]);

            await expect(validateCloudBillingAccount()).rejects.toThrow(
                'Could not locate any master cloud billing accounts. Please follow the instructions on https://cloud.google.com/billing/docs/how-to/manage-billing-account to create a master cloud billing account.'
            );

            expect(mockListBillingAccounts).toHaveBeenCalledTimes(1);
            expect(mockListBillingAccounts.mock.calls[0][0].pageSize).toBe(1);
        });

        test('cloudBillingClient defined, no cloudBillingAccount', async () => {
            const testListBillingAccountsResponse =
                new billingProtos.google.cloud.billing.v1.ListBillingAccountsResponse();

            testListBillingAccountsResponse.billingAccounts = [];
            mockListBillingAccounts.mockResolvedValueOnce([
                [],
                null,
                testListBillingAccountsResponse
            ]);

            const cloudBillingClient = new CloudBillingClient();

            await expect(
                validateCloudBillingAccount(cloudBillingClient)
            ).rejects.toThrow(
                'Could not locate any master cloud billing accounts. Please follow the instructions on https://cloud.google.com/billing/docs/how-to/manage-billing-account to create a master cloud billing account.'
            );

            expect(mockListBillingAccounts).toHaveBeenCalledTimes(1);
            expect(mockListBillingAccounts.mock.calls[0][0].pageSize).toBe(1);
        });

        test('cloudBillingClient defined, with open masterCloudBillingAccount', async () => {
            const TEST_MASTER_BILLING_ACCOUNT = `testMasterBillingAccount-${uuidV4()}`;

            const testListBillingAccountsResponse =
                new billingProtos.google.cloud.billing.v1.ListBillingAccountsResponse();
            const testBillingAccounts: billingProtos.google.cloud.billing.v1.BillingAccount[] =
                [];

            testBillingAccounts.push(createTestBillingAccount(true, ''));
            testBillingAccounts.push(createTestBillingAccount(false, ''));
            testBillingAccounts.push(
                createTestBillingAccount(true, TEST_MASTER_BILLING_ACCOUNT)
            );
            testBillingAccounts.push(
                createTestBillingAccount(false, TEST_MASTER_BILLING_ACCOUNT)
            );
            testListBillingAccountsResponse.billingAccounts =
                testBillingAccounts;
            mockListBillingAccounts.mockResolvedValueOnce([
                testBillingAccounts,
                null,
                testListBillingAccountsResponse
            ]);

            const cloudBillingClient = new CloudBillingClient();

            await expect(
                validateCloudBillingAccount(cloudBillingClient)
            ).resolves.not.toThrow();

            expect(mockListBillingAccounts).toHaveBeenCalledTimes(1);
            expect(mockListBillingAccounts.mock.calls[0][0].pageSize).toBe(1);
        });

        afterEach(() => {
            expect(mockGetProjectId).not.toHaveBeenCalled();
            expect(mockEnableService).not.toHaveBeenCalled();
        });
    });

    describe('Testing initializeGoogleCloudCommon(): ', () => {
        test('projectIdentifier undefined', async () => {
            const TEST_PROJECT_IDENTIFIER = `test-project-id-${uuidV4()}`;
            const ENABLE_SERVICE_REQUEST_SERVICE_NAME = `projects/${TEST_PROJECT_IDENTIFIER}/services/${CLOUD_BILLING_API}`;
            const TEST_MASTER_BILLING_ACCOUNT = `testMasterBillingAccount-${uuidV4()}`;

            mockGetProjectId.mockResolvedValueOnce(TEST_PROJECT_IDENTIFIER);
            const enableServiceResponse = createEnableServiceResponse(
                TEST_PROJECT_IDENTIFIER,
                CLOUD_BILLING_API,
                true
            );
            const mockEnableServiceResponsePromise = jest.fn();

            mockEnableServiceResponsePromise.mockResolvedValueOnce([
                enableServiceResponse
            ]);
            mockEnableService.mockResolvedValueOnce([
                {
                    promise: mockEnableServiceResponsePromise
                }
            ]);
            const testListBillingAccountsResponse =
                new billingProtos.google.cloud.billing.v1.ListBillingAccountsResponse();
            const testBillingAccounts: billingProtos.google.cloud.billing.v1.BillingAccount[] =
                [];

            testBillingAccounts.push(createTestBillingAccount(true, ''));
            testBillingAccounts.push(createTestBillingAccount(false, ''));
            testBillingAccounts.push(
                createTestBillingAccount(true, TEST_MASTER_BILLING_ACCOUNT)
            );
            testBillingAccounts.push(
                createTestBillingAccount(false, TEST_MASTER_BILLING_ACCOUNT)
            );
            testListBillingAccountsResponse.billingAccounts =
                testBillingAccounts;
            mockListBillingAccounts.mockResolvedValueOnce([
                testBillingAccounts,
                null,
                testListBillingAccountsResponse
            ]);

            const cloudBillingClient = await initializeGoogleCloudCommon();

            expect(cloudBillingClient).not.toBeNull();
            expect(mockGetProjectId).toHaveBeenCalledTimes(1);
            expect(mockEnableService).toHaveBeenCalledTimes(1);
            expect(mockEnableService.mock.calls[0][0].name).toBe(
                ENABLE_SERVICE_REQUEST_SERVICE_NAME
            );
            expect(mockEnableServiceResponsePromise).toHaveBeenCalledTimes(1);
            expect(mockListBillingAccounts).toHaveBeenCalledTimes(1);
            expect(mockListBillingAccounts.mock.calls[0][0].pageSize).toBe(1);
        });
    });
});
