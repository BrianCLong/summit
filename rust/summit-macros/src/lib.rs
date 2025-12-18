use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

#[proc_macro_attribute]
pub fn traced(_args: TokenStream, input: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);
    let fn_name = &input_fn.sig.ident;
    let block = &input_fn.block;
    let vis = &input_fn.vis;
    let sig = &input_fn.sig;

    let expanded = quote! {
        #vis #sig {
            let _span = tracing::info_span!(stringify!(#fn_name)).entered();
            #block
        }
    };

    TokenStream::from(expanded)
}
