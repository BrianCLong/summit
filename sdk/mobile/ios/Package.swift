// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "ODPS",
    platforms: [
        .iOS(.v13)
    ],
    products: [
        .library(name: "ODPS", targets: ["ODPS"])
    ],
    targets: [
        .target(name: "ODPS"),
        .testTarget(name: "ODPSTests", dependencies: ["ODPS"])
    ]
)
