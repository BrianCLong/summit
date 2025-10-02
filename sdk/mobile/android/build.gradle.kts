plugins {
  kotlin("jvm") version "2.0.21"
}

group = "com.summit.odps"
version = "0.1.0"

repositories {
  mavenCentral()
}

dependencies {
  implementation(kotlin("stdlib"))
  testImplementation(kotlin("test"))
}

tasks.test {
  useJUnitPlatform()
}

