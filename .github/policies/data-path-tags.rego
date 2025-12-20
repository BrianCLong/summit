package summit.policies.datapaths

import future.keywords.in

required_paths := {"maestro", "intelgraph", "companyos"}

deny[msg] {
	not input.dataPaths
	msg := "dataPaths block is missing from configuration"
}

deny[msg] {
	some name
	required_paths[name]
	not input.dataPaths[name]
	msg := sprintf("%s data path is not defined", [name])
}

deny[msg] {
	some name
	dp := input.dataPaths[name]
	not dp.path
	msg := sprintf("%s data path is missing the path field", [name])
}

deny[msg] {
	some name
	dp := input.dataPaths[name]
	dp.path == ""
	msg := sprintf("%s data path has an empty path value", [name])
}

deny[msg] {
	some name
	dp := input.dataPaths[name]
	not dp.tags
	msg := sprintf("%s data path is missing tags", [name])
}

deny[msg] {
	some name
	dp := input.dataPaths[name]
	count(dp.tags) == 0
	msg := sprintf("%s data path must define at least one tag", [name])
}

ok {
	count({m | deny[m]}) == 0
}
