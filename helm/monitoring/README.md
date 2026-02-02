Values for installing kube-prometheus-stack via upstream chart.

Install example:

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack -n monitoring --create-namespace -f values.yaml
