with open('scripts/generate-sbom.sh') as f:
    content = f.read()

content = content.replace('syft packages dir:. -o "cyclonedx-json@$CYCLONEDX_VERSION" --file "$OUTPUT_DIR/${ARTIFACT_NAME}-${service_name}-${VERSION}.cdx.json"', 'syft scan dir:. -o "cyclonedx-json@$CYCLONEDX_VERSION=$OUTPUT_DIR/${ARTIFACT_NAME}-${service_name}-${VERSION}.cdx.json"')
content = content.replace('syft packages dir:. -o cyclonedx-json --file "$OUTPUT_DIR/${ARTIFACT_NAME}-${service_name}-${VERSION}.cdx.json"', 'syft scan dir:. -o cyclonedx-json="$OUTPUT_DIR/${ARTIFACT_NAME}-${service_name}-${VERSION}.cdx.json"')

content = content.replace('syft packages dir:. -o "spdx-json@$SPDX_VERSION" --file "$OUTPUT_DIR/${ARTIFACT_NAME}-${service_name}-${VERSION}.spdx.json"', 'syft scan dir:. -o "spdx-json@$SPDX_VERSION=$OUTPUT_DIR/${ARTIFACT_NAME}-${service_name}-${VERSION}.spdx.json"')
content = content.replace('syft packages dir:. -o spdx-json --file "$OUTPUT_DIR/${ARTIFACT_NAME}-${service_name}-${VERSION}.spdx.json"', 'syft scan dir:. -o spdx-json="$OUTPUT_DIR/${ARTIFACT_NAME}-${service_name}-${VERSION}.spdx.json"')

content = content.replace('syft packages dir:. -o table --file "$OUTPUT_DIR/${ARTIFACT_NAME}-${service_name}-${VERSION}.syft.txt"', 'syft scan dir:. -o table="$OUTPUT_DIR/${ARTIFACT_NAME}-${service_name}-${VERSION}.syft.txt"')

content = content.replace('syft packages dir:. -o cyclonedx-json --file "$OUTPUT_DIR/${ARTIFACT_NAME}-npm-${VERSION}-alt.cdx.json"', 'syft scan dir:. -o cyclonedx-json="$OUTPUT_DIR/${ARTIFACT_NAME}-npm-${VERSION}-alt.cdx.json"')

content = content.replace('syft packages dir:. -o cyclonedx-json --file "$OUTPUT_DIR/${ARTIFACT_NAME}-python-${VERSION}.cdx.json"', 'syft scan dir:. -o cyclonedx-json="$OUTPUT_DIR/${ARTIFACT_NAME}-python-${VERSION}.cdx.json"')

content = content.replace('syft packages dir:. -o cyclonedx-json --file "$OUTPUT_DIR/${ARTIFACT_NAME}-java-${VERSION}.cdx.json"', 'syft scan dir:. -o cyclonedx-json="$OUTPUT_DIR/${ARTIFACT_NAME}-java-${VERSION}.cdx.json"')

with open('scripts/generate-sbom.sh', 'w') as f:
    f.write(content)
