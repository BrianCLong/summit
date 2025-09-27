import { gql, useQuery, useMutation } from '@apollo/client';
const Q = gql`query { org { id name ssoMode } }`;
const M = gql`mutation($on:Boolean!){ setSsoRequired(required:$on){ id ssoMode } }`;

export const OrgIdentity = () => {
  const { data, refetch } = useQuery(Q);
  const [setReq] = useMutation(M);
  return (
    <div className="p-4 border rounded-2xl">
      <h3 className="font-semibold">Single Sign-On</h3>
      <div className="text-sm mb-2">Mode: {data?.org?.ssoMode}</div>
      <button id="btnSsoReq" className="px-3 py-2 bg-indigo-600 text-white rounded">Require SSO</button>
      <script dangerouslySetInnerHTML={{__html:`
        (function(){
          $('#btnSsoReq').on('click', async function(){
            await window.__apollo.mutate({ mutation: ${'`'+M.loc?.source.body+'`'}, variables: { on: true }});
            location.reload();
          });
        })();`}} />
    </div>
  );
};