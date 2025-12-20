plugins {
    id("com.android.library") version "8.5.1"
    kotlin("android") version "1.9.25"
}

android {
    namespace = "com.summit.acx"
    compileSdk = 35

    defaultConfig {
        minSdk = 24
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation(kotlin("stdlib"))
}
