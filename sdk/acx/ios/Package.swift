// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "ACX",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "ACX",
            targets: ["ACX"]
        )
    ],
    targets: [
        .target(
            name: "ACX",
            path: "Sources"
        ),
        .testTarget(
            name: "ACXTests",
            dependencies: ["ACX"],
            path: "Tests"
        )
    ]
)
