plugins {
  kotlin("jvm") version "1.9.25"
}

repositories {
  mavenCentral()
}

dependencies {
  implementation("org.apache.kafka:kafka-streams:3.7.0")
  implementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.17.2")

  testImplementation(kotlin("test"))
  testImplementation("org.apache.kafka:kafka-streams-test-utils:3.7.0")
}

tasks.test {
  useJUnitPlatform()
}
