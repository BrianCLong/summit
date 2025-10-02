fn main() {
    let proto_file = "../proto/mtfs.proto";
    println!("cargo:rerun-if-changed={proto_file}");
    tonic_build::configure()
        .build_client(true)
        .build_server(true)
        .compile(&[proto_file], &["../proto"]) // includes relative
        .expect("Failed to compile MTFS proto");
}
