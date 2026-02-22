package realtime
import future.keywords.if

default allow = false

# Allow subscription if tenant matches token
allow {
    input.method == "subscribe"
    input.user.tenant == input.args.tenant
}

# Allow reading event stream if tenant matches
allow {
    input.path == "/events/stream"
    input.user.tenant == input.query.tenant
}
