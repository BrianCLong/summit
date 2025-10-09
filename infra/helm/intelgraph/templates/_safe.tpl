{{/*
  safe maps so `.Values.database.postgresql.existingSecret` doesn't explode
*/}}
{{- define "safe.map" -}}
{{- $m := . -}}
{{- if kindIs "map" $m -}}{{- $m -}}{{- else -}}{{- dict -}}{{- end -}}
{{- end -}}

{{- define "safe.db" -}}
{{- $db := include "safe.map" . | fromYaml -}}
{{- $pg := include "safe.map" (get $db "postgresql") | fromYaml -}}
{{- $secret := get $pg "existingSecret" | default "" -}}
{{- $out := dict "pg" $pg "secret" $secret -}}
{{- toYaml $out -}}
{{- end -}}

{{- define "safe.neo4j" -}}
{{- $db := include "safe.map" . | fromYaml -}}
{{- $neo4j := include "safe.map" (get $db "neo4j") | fromYaml -}}
{{- $secret := get $neo4j "existingSecret" | default "" -}}
{{- $out := dict "neo4j" $neo4j "secret" $secret -}}
{{- toYaml $out -}}
{{- end -}}

{{- define "safe.redis" -}}
{{- $db := include "safe.map" . | fromYaml -}}
{{- $redis := include "safe.map" (get $db "redis") | fromYaml -}}
{{- $secret := get $redis "existingSecret" | default "" -}}
{{- $out := dict "redis" $redis "secret" $secret -}}
{{- toYaml $out -}}
{{- end -}}