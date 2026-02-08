from safety.sandbox.runner import net_http_get, net_http_post, load_policy
def http_get(url: str, approved: bool = False):
    return net_http_get(url, approved, load_policy())
def http_post(url: str, data: dict, approved: bool = False):
    return net_http_post(url, data, approved, load_policy())
