export declare const createClient: (baseURL: string, token?: string) => {
    listRuns: <TData = import("axios").AxiosResponse<import("../sdk/ts/src/generated").Run[], any>>(options?: import("axios").AxiosRequestConfig) => Promise<TData>;
    createRun: <TData = import("axios").AxiosResponse<import("../sdk/ts/src/generated").Run, any>>(createRunRequest: import("../sdk/ts/src/generated").CreateRunRequest, options?: import("axios").AxiosRequestConfig) => Promise<TData>;
    getRunById: <TData = import("axios").AxiosResponse<import("../sdk/ts/src/generated").Run, any>>(runId: string, options?: import("axios").AxiosRequestConfig) => Promise<TData>;
    getDeprecatedRuns: <TData = import("axios").AxiosResponse<import("../sdk/ts/src/generated").Run[], any>>(options?: import("axios").AxiosRequestConfig) => Promise<TData>;
    listPipelines: <TData = import("axios").AxiosResponse<import("../sdk/ts/src/generated").Pipeline[], any>>(options?: import("axios").AxiosRequestConfig) => Promise<TData>;
    getTenantBudget: <TData = import("axios").AxiosResponse<import("../sdk/ts/src/generated").Budget, any>>(params: import("../sdk/ts/src/generated").GetTenantBudgetParams, options?: import("axios").AxiosRequestConfig) => Promise<TData>;
    listAlertEvents: <TData = import("axios").AxiosResponse<import("../sdk/ts/src/generated").AlertEvent[], any>>(options?: import("axios").AxiosRequestConfig) => Promise<TData>;
};
