resource "aws_kms_grant" "tenant" {
  name          = "grant-${var.env}-${var.tenant_id}"
  key_id        = var.key_id
  grantee_principal = var.grantee_principal
  operations    = ["Encrypt","Decrypt","GenerateDataKey","GenerateDataKeyWithoutPlaintext","DescribeKey"]
  constraints {
    encryption_context_equals = {
      tenant  = var.tenant_id
      env     = var.env
    }
  }
}
