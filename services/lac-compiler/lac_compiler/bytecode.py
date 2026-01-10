from .models import BytecodeInstruction, PolicyIR, Rule


class BytecodeCompiler:
    def compile(self, policy: PolicyIR) -> list[BytecodeInstruction]:
        bytecode: list[BytecodeInstruction] = []

        if policy.license:
            bytecode.append(
                BytecodeInstruction(
                    op="REQUIRE_LICENSE",
                    args=[policy.license],
                    description="Policy requires license match",
                )
            )

        if policy.legal_basis:
            bytecode.append(
                BytecodeInstruction(
                    op="REQUIRE_BASIS",
                    args=[policy.legal_basis],
                    description="Policy requires legal basis",
                )
            )

        if policy.purposes:
            bytecode.append(
                BytecodeInstruction(
                    op="ALLOW_PURPOSES",
                    args=[policy.purposes],
                    description="Approved purposes",
                )
            )

        if policy.retention:
            bytecode.append(
                BytecodeInstruction(
                    op="MAX_RETENTION",
                    args=[policy.retention],
                    description="Retention ceiling",
                )
            )

        for rule in policy.rules:
            bytecode.extend(self._compile_rule(rule))

        bytecode.append(
            BytecodeInstruction(op="DEFAULT_DENY", args=[], description="Implicit deny")
        )
        return bytecode

    def _compile_rule(self, rule: Rule) -> list[BytecodeInstruction]:
        instructions: list[BytecodeInstruction] = [
            BytecodeInstruction(
                op="RULE_START",
                args=[rule.effect, rule.subject, rule.action, rule.resource],
                description=rule.description,
            )
        ]

        for cond in rule.conditions:
            instructions.append(
                BytecodeInstruction(
                    op="CHECK_CONDITION",
                    args=[cond.field, cond.operator, cond.value],
                    description=f"{cond.field} {cond.operator} {cond.value}",
                )
            )

        instructions.append(
            BytecodeInstruction(
                op="EFFECT",
                args=[rule.effect],
                description=f"{rule.effect} on match",
            )
        )
        return instructions
