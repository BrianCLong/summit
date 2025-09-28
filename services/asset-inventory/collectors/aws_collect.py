import boto3, json, os, datetime, sqlite3
ORG_ROLE_ARN = os.getenv("AWS_ORG_AUDIT_ROLE_ARN")
DB_PATH = os.getenv("DB_PATH", "./data/inventory.db")

def assume(role):
    sts=boto3.client('sts')
    creds=sts.assume_role(RoleArn=role, RoleSessionName='asset-inventory')['Credentials']
    return boto3.client('organizations',
        aws_access_key_id=creds['AccessKeyId'],
        aws_aws_secret_access_key=creds['SecretAccessKey'],
        aws_session_token=creds['SessionToken'])

def run():
    org=assume(ORG_ROLE_ARN)
    paginator = org.get_paginator('list_accounts')
    rows=[]
    for page in paginator.paginate():
        for a in page['Accounts']:
            rows.append((a['Id'], 'aws', a.get('Name'), a.get('Arn'), a.get('Status'), json.dumps(a), json.dumps({"source":"aws-sdk","ts":datetime.datetime.utcnow().isoformat()})))
    with sqlite3.connect(DB_PATH) as c:
        c.executemany("insert into inventory_cloud_accounts (id,provider,name,org_path,status,raw,provenance) values (?,?,?,?,?,?,?) on conflict(id) do update set name=excluded.name, status=excluded.status, raw=excluded.raw", rows)

if __name__ == "__main__":
    run()
