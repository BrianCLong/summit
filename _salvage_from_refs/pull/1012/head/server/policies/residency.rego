package residency

default allow = false

allow {
  input.region := region
  allowed := input.allowed_regions
  region == allowed[_]
}

allow {
  input.waiver == true
}
