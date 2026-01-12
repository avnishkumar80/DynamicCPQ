import { init } from 'z3-solver';
import { Configuration, Rule, ProductAttribute, ValidationResult, ValidationViolation } from '../types';
import { ValidationEngine } from './engine';

// Singleton Z3 Context
let z3: any = null;
let Context: any = null;

export const initZ3 = async () => {
    if (Context) return Context;
    const { Context: Z3Context } = await init();
    Context = new Z3Context('main'); // Use Singleton 'main' context
    return Context;
};

// Locking mechanism
let isRunning = false;

export const validateZ3 = async (
    config: Configuration,
    rules: Rule[],
    attributes: ProductAttribute[]
): Promise<ValidationResult> => {

    const violations: ValidationViolation[] = [];

    if (isRunning) {
        console.warn("Z3 skipped: Previous validation still running");
        return { isValid: true, violations: [] };
    }

    isRunning = true;
    try {
        if (!Context) await initZ3();
        // String sort is missing in this build, so we map everything to Ints.
        const { Solver, Int, Or, Implies, Not, And, Eq } = Context;

        const solver = new Solver();

        // --- MAPPING LOGIC ---
        // Z3 Ints will represent our categorical strings.
        // Map: AttributeId -> { "valueString": intCode }
        const valueMap: Record<string, Record<string, number>> = {};
        const reverseValueMap: Record<string, Record<number, string>> = {};

        // Initialize mapping from Schema
        attributes.forEach(attr => {
            valueMap[attr.id] = {};
            reverseValueMap[attr.id] = {};
            let counter = 1;

            // Add defined options
            attr.options?.forEach(opt => {
                const valStr = String(opt.value);
                valueMap[attr.id][valStr] = counter;
                reverseValueMap[attr.id][counter] = valStr;
                counter++;
            });
        });

        // Helper to get int code for a value (auto-adding if new literal found in rules)
        const getCode = (attrId: string, val: any): number => {
            const valStr = String(val);

            // If it's a raw number and the attribute seems numeric, we might treat it as a number?
            // But for safety in this refactor, let's treat *categorical* as mapped ints, 
            // and *numeric* attributes as raw ints.
            const attr = attributes.find(a => a.id === attrId);
            if (attr && attr.type === 'number') {
                return Number(val);
            }

            // Categorical / String / Boolean fallback
            if (!valueMap[attrId]) {
                valueMap[attrId] = {};
                reverseValueMap[attrId] = {};
            }

            if (valueMap[attrId][valStr] === undefined) {
                // Assign next code
                const nextCode = Object.keys(valueMap[attrId]).length + 1;
                valueMap[attrId][valStr] = nextCode;
                reverseValueMap[attrId][nextCode] = valStr;
            }

            return valueMap[attrId][valStr];
        };

        // --- Z3 TRANSLATION ---

        const getZ3Expr = (attrId: string, op: string, val: any) => {
            const z3Var = Int.const(attrId);
            const code = getCode(attrId, val);
            const z3Val = Int.val(code);

            switch (op) {
                case '==': return Eq(z3Var, z3Val);
                case '!=': return Not(Eq(z3Var, z3Val));
                case '>': return z3Var.gt(z3Val);
                case '>=': return z3Var.ge(z3Val);
                case '<': return z3Var.lt(z3Val);
                case '<=': return z3Var.le(z3Val);
                case 'in':
                    // val should be array
                    if (Array.isArray(val)) {
                        const opts = val.map(v => Eq(z3Var, Int.val(getCode(attrId, v))));
                        // Or(eq1, eq2, ...)
                        return Or(...opts);
                    }
                    return Eq(z3Var, z3Val);
                default: return Eq(z3Var, z3Val);
            }
        }


        // 2. Assert Rules (Hard Constraints)
        for (const rule of rules) {
            if (!rule.approved) continue;

            try {
                const cond = getZ3Expr(rule.condition.attribute, rule.condition.operator, rule.condition.value);

                if (rule.type === 'implication') {
                    const cons = getZ3Expr(rule.consequence!.attribute, rule.consequence!.operator, rule.consequence!.value);
                    solver.add(Implies(cond, cons));
                } else if (rule.type === 'exclusion') {
                    solver.add(Not(cond));
                }
            } catch (e) {
                console.warn("Skipping rule translation", e);
            }
        }

        // 3. Assert User Config (Assumptions)
        const userAssertions = [];
        for (const [key, value] of Object.entries(config)) {
            if (value !== undefined && value !== "") {
                const z3Var = Int.const(key);
                const code = getCode(key, value);
                userAssertions.push(Eq(z3Var, Int.val(code)));
            }
        }

        // 4. Check SAT
        const result = await solver.check(...userAssertions);

        if (result === 'unsat') {
            // const core = solver.unsat_core(); // Not available in this build?
            violations.push({
                rule_id: 'z3-constraint',
                message: "Configuration violates constraints (Detected by Z3 Engine).",
                severity: 'error',
                source: 'Z3 SAT Solver',
                involvedAttributes: Object.keys(config) // Blame everything for now
            });
        }
    } finally {
        isRunning = false;
    }

    return {
        isValid: violations.length === 0,
        violations
    };
};

export class Z3SatEngine implements ValidationEngine {
    async validate(config: Configuration, rules: Rule[], attributes: ProductAttribute[]): Promise<ValidationResult> {
        try {
            return await validateZ3(config, rules, attributes);
        } catch (e) {
            console.error("Z3 Engine Failed", e);
            return {
                isValid: false, violations: [{
                    rule_id: 'z3-error',
                    message: "Z3 Engine Crashed. Please check console.",
                    severity: 'error',
                    source: 'System'
                }]
            };
        }
    }
}
