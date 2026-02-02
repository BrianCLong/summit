# openapi_client.DefaultApi

All URIs are relative to */v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**verify_claim**](DefaultApi.md#verify_claim) | **POST** /verify | Verify a claim


# **verify_claim**
> VerifyResponse verify_claim(verify_request)

Verify a claim

### Example

* Api Key Authentication (ApiKeyAuth):

```python
import openapi_client
from openapi_client.models.verify_request import VerifyRequest
from openapi_client.models.verify_response import VerifyResponse
from openapi_client.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to /v1
# See configuration.py for a list of all supported configuration parameters.
configuration = openapi_client.Configuration(
    host = "/v1"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: ApiKeyAuth
configuration.api_key['ApiKeyAuth'] = os.environ["API_KEY"]

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['ApiKeyAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = openapi_client.DefaultApi(api_client)
    verify_request = openapi_client.VerifyRequest() # VerifyRequest |

    try:
        # Verify a claim
        api_response = api_instance.verify_claim(verify_request)
        print("The response of DefaultApi->verify_claim:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->verify_claim: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **verify_request** | [**VerifyRequest**](VerifyRequest.md)|  |

### Return type

[**VerifyResponse**](VerifyResponse.md)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Verification result |  -  |
**401** | Unauthorized |  -  |
**503** | Service Unavailable |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)
