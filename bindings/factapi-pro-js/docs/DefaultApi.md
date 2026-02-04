# FactApiPro.DefaultApi

All URIs are relative to */v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**verifyClaim**](DefaultApi.md#verifyClaim) | **POST** /verify | Verify a claim



## verifyClaim

> VerifyResponse verifyClaim(verifyRequest)

Verify a claim

### Example

```javascript
import FactApiPro from 'fact_api_pro';
let defaultClient = FactApiPro.ApiClient.instance;
// Configure API key authorization: ApiKeyAuth
let ApiKeyAuth = defaultClient.authentications['ApiKeyAuth'];
ApiKeyAuth.apiKey = 'YOUR API KEY';
// Uncomment the following line to set a prefix for the API key, e.g. "Token" (defaults to null)
//ApiKeyAuth.apiKeyPrefix = 'Token';

let apiInstance = new FactApiPro.DefaultApi();
let verifyRequest = new FactApiPro.VerifyRequest(); // VerifyRequest |
apiInstance.verifyClaim(verifyRequest, (error, data, response) => {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
});
```

### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **verifyRequest** | [**VerifyRequest**](VerifyRequest.md)|  |

### Return type

[**VerifyResponse**](VerifyResponse.md)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json
