export function createRngFromSeed(seed) {
    // mulberry32
    let t = seed >>> 0;
    return function() {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function round(v) {
    return Math.round(v * 100) / 100;
}

export function runSimulation({
    probabilities = [0.17,0.48,0.11,0.24],
    hp = 100,
    helmet = 20,
    vest = 85,
    seed = 33,
    count = 5000,
    onProgress = () => {}
}) {
    // normalize probabilities if needed
    let sum = probabilities.reduce((a,b)=>a+b,0);
    if (sum <= 0) {
        throw new Error("概率和必须大于 0");
    }
    probabilities = probabilities.map(p => p / sum);

    const PARTS = ["头","胸","上臂","下臂"];
    const rng = createRngFromSeed(Number(seed) || 0);

    function calculateDamage(part, baseDamage, actualArmorDamage, curHelmet, curVest) {
        const headMul = 1.9;
        const armMul = 0.4;
        const pen = 0.5;
        let f=0, penDmg=0;
        switch(part) {
            case "头":
                f = baseDamage * headMul;
                penDmg = f * pen;
                if (curHelmet > 0) {
                    if (curHelmet >= actualArmorDamage) return round(penDmg);
                    const p = curHelmet / actualArmorDamage;
                    return round(p * penDmg + (1 - p) * f);
                }
                return round(f);
            case "胸":
                f = baseDamage;
                penDmg = f * pen;
                if (curVest > 0) {
                    if (curVest >= actualArmorDamage) return round(penDmg);
                    const p = curVest / actualArmorDamage;
                    return round(p * penDmg + (1 - p) * f);
                }
                return round(f);
            case "上臂":
                f = baseDamage * armMul;
                penDmg = f * pen;
                if (curVest > 0) {
                    if (curVest >= actualArmorDamage) return round(penDmg);
                    const p = curVest / actualArmorDamage;
                    return round(p * penDmg + (1 - p) * f);
                }
                return round(f);
            case "下臂":
                return round(baseDamage * armMul);
            default:
                return 0;
        }
    }

    function updateArmor(part, actualArmorDamage, curHelmet, curVest) {
        if (part === "头" && curHelmet > 0) {
            if (curHelmet >= actualArmorDamage) curHelmet -= actualArmorDamage;
            else curHelmet = 0;
        } else if ((part === "胸" || part === "上臂") && curVest > 0) {
            if (curVest >= actualArmorDamage) curVest -= actualArmorDamage;
            else curVest = 0;
        }
        return [curHelmet, curVest];
    }

    function simulateSingle(baseDamage, armorDamage, localRng) {
        const actualArmorDamage = armorDamage * 1.1;
        let totalDamage = 0;
        let curHelmet = helmet;
        let curVest = vest;
        let seq = [];
        while (totalDamage < hp) {
            const part = (function(){ // use local weighted random
                const r = localRng();
                let cumulative = 0;
                for (let i=0;i<probabilities.length;i++){
                    cumulative += probabilities[i];
                    if (r < cumulative) return PARTS[i];
                }
                return PARTS[PARTS.length-1];
            })();
            seq.push(part);
            const dmg = calculateDamage(part, baseDamage, actualArmorDamage, curHelmet, curVest);
            totalDamage = round(totalDamage + dmg);
            const updated = updateArmor(part, actualArmorDamage, curHelmet, curVest);
            curHelmet = updated[0];
            curVest = updated[1];
        }
        return seq.join("|") + "|";
    }

    function simulateWithBlue(sequence) {
        const actualArmorDamage = 40.0 * 1.1;
        const baseDamage = 38.0;
        let totalDamage = 0;
        let curHelmet = helmet;
        let curVest = vest;
        const parts = sequence.split("|");
        for (let p of parts) {
            if (!p) continue;
            const dmg = calculateDamage(p, baseDamage, actualArmorDamage, curHelmet, curVest);
            totalDamage = round(totalDamage + dmg);
            if (totalDamage >= hp) return true;
            const updated = updateArmor(p, actualArmorDamage, curHelmet, curVest);
            curHelmet = updated[0];
            curVest = updated[1];
        }
        return false;
    }

    // collect unique sequences and occurrence counts
    const freq = Object.create(null); // seq => count
    const blueKillMap = Object.create(null); // seq => boolean (whether blue kills this sequence)
    for (let i=0;i<count;i++) {
        const seq = simulateSingle(40.0, 42.0, rng);
        freq[seq] = (freq[seq] || 0) + 1;
        // compute blue result once per unique sequence
        if (blueKillMap[seq] === undefined) {
            blueKillMap[seq] = simulateWithBlue(seq);
        }
        if (i % Math.max(1, Math.floor(count/20)) === 0) {
            onProgress({phase: 'collect', progress: i / count});
        }
    }
    onProgress({phase: 'collect', progress: 1});

    const uniqueArray = Object.keys(freq);
    let uniqueStillKill = 0, uniqueNotKill = 0;
    let occStillKill = 0, occNotKill = 0;
    const notKillSeqs = [];

    for (let i=0;i<uniqueArray.length;i++) {
        const seq = uniqueArray[i];
        const kills = !!blueKillMap[seq];
        const occurrences = freq[seq] || 0;
        if (kills) {
            uniqueStillKill++;
            occStillKill += occurrences;
        } else {
            uniqueNotKill++;
            occNotKill += occurrences;
            notKillSeqs.push(seq);
        }
        if (i % Math.max(1, Math.floor(uniqueArray.length/20)) === 0) {
            onProgress({phase: 'verify', progress: i / uniqueArray.length});
        }
    }
    onProgress({phase: 'verify', progress: 1});

    return {
        totalSimulated: count,
        uniqueSequences: uniqueArray.length,
        // unique counts
        uniqueStillKill,
        uniqueNotKill,
        // occurrence counts across all simulations
        occStillKill,
        occNotKill,
        notKillSeqs
    };
}

/**
 * 生成逐枪日志
 * sequence: 格式 "上臂|胸|上臂|"
 * opts: { weapon: 'typhoon'|'blue'|{base,armor}, hp, helmet, vest }
 * 返回字符串数组，第一项为最后一枪（第N枪），按示例格式描述每一枪
 */
export function generateShotLog(sequence, opts = {}) {
    const PARTS = { "头":"头部", "胸":"胸部", "上臂":"上臂", "下臂":"下臂" };
    let baseDamage, armorDamage;
    if (opts.weapon === 'blue') {
        baseDamage = 38.0; armorDamage = 40.0;
    } else if (opts.weapon === 'typhoon' || !opts.weapon) {
        baseDamage = 40.0; armorDamage = 42.0;
    } else if (typeof opts.weapon === 'object') {
        baseDamage = Number(opts.weapon.base) || 40.0;
        armorDamage = Number(opts.weapon.armor) || 42.0;
    } else {
        baseDamage = 40.0; armorDamage = 42.0;
    }

    const actualArmorDamage = armorDamage * 1.1;
    const hp = Number(opts.hp) || 100;
    let helmet = Number(opts.helmet) || 20;
    let vest = Number(opts.vest) || 85;

    const headMul = 1.9;
    const armMul = 0.4;
    const pen = 0.5;

    const parts = sequence.split("|").filter(p => p);
    const shots = [];

    let totalDamage = 0;
    let currentHP = hp;

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        let f = 0, penDmg = 0;
        let text = '';
        let dmg = 0;
        let armorLoss = 0;

        if (part === "头") {
            f = baseDamage * headMul; penDmg = f * pen;
            if (helmet > 0) {
                if (helmet >= actualArmorDamage) {
                    dmg = round(penDmg);
                    armorLoss = round(actualArmorDamage);
                    totalDamage = round(totalDamage + dmg);
                    helmet = round(helmet - actualArmorDamage);
                    text = `命中 ${PARTS[part]}，造成 ${dmg} 穿透伤害。头盔抵挡了 ${dmg} 伤害，损失 ${armorLoss} 耐久。`;
                } else {
                    const p = helmet / actualArmorDamage;
                    dmg = round(p * penDmg + (1 - p) * f);
                    armorLoss = round(helmet);
                    totalDamage = round(totalDamage + dmg);
                    helmet = 0;
                    text = `命中 ${PARTS[part]}，击破了护甲，造成 ${dmg} 混合伤害。护甲损失 ${armorLoss} 耐久。`;
                }
            } else {
                dmg = round(f);
                totalDamage = round(totalDamage + dmg);
                text = `命中未受保护的 ${PARTS[part]}，造成 ${dmg} 伤害。`;
            }
        } else if (part === "胸") {
            f = baseDamage; penDmg = f * pen;
            if (vest > 0) {
                if (vest >= actualArmorDamage) {
                    dmg = round(penDmg);
                    armorLoss = round(actualArmorDamage);
                    totalDamage = round(totalDamage + dmg);
                    vest = round(vest - actualArmorDamage);
                    text = `命中 ${PARTS[part]}，造成 ${dmg} 穿透伤害。护甲抵挡了 ${dmg} 伤害，损失 ${armorLoss} 耐久。`;
                } else {
                    const p = vest / actualArmorDamage;
                    dmg = round(p * penDmg + (1 - p) * f);
                    armorLoss = round(vest);
                    totalDamage = round(totalDamage + dmg);
                    vest = 0;
                    text = `命中 ${PARTS[part]}，击破了护甲，造成 ${dmg} 混合伤害。护甲损失 ${armorLoss} 耐久。`;
                }
            } else {
                dmg = round(f);
                totalDamage = round(totalDamage + dmg);
                text = `命中未受保护的 ${PARTS[part]}，造成 ${dmg} 伤害。`;
            }
        } else if (part === "上臂") {
            f = baseDamage * armMul; penDmg = f * pen;
            if (vest > 0) {
                if (vest >= actualArmorDamage) {
                    dmg = round(penDmg);
                    armorLoss = round(actualArmorDamage);
                    totalDamage = round(totalDamage + dmg);
                    vest = round(vest - actualArmorDamage);
                    text = `命中 ${PARTS[part]}，造成 ${dmg} 穿透伤害。护甲抵挡了 ${dmg} 伤害，损失 ${armorLoss} 耐久。`;
                } else {
                    const p = vest / actualArmorDamage;
                    dmg = round(p * penDmg + (1 - p) * f);
                    armorLoss = round(vest);
                    totalDamage = round(totalDamage + dmg);
                    vest = 0;
                    text = `命中 ${PARTS[part]}，击破了护甲，造成 ${dmg} 混合伤害。护甲损失 ${armorLoss} 耐久。`;
                }
            } else {
                dmg = round(f);
                totalDamage = round(totalDamage + dmg);
                text = `命中未受保护的 ${PARTS[part]}，造成 ${dmg} 伤害。`;
            }
        } else if (part === "下臂") {
            dmg = round(baseDamage * armMul);
            totalDamage = round(totalDamage + dmg);
            text = `命中未受保护的 ${PARTS[part]}，造成 ${dmg} 伤害。`;
        } else {
            text = `命中 ${part}，造成未知伤害。`;
        }

        currentHP = round(hp - totalDamage);
        shots.push({
            shotIndex: i + 1,
            part,
            dmg,
            armorLoss,
            text,
            remainingHP: currentHP
        });

        // keep processing full sequence (sequence typically ends at or after dead)
    }

    // lines for display (reverse order so last shot listed first like示例)
    const lines = [];
    for (let idx = shots.length - 1; idx >= 0; idx--) {
        const s = shots[idx];
        lines.push(`第${s.shotIndex}枪: ${s.text}`);
    }

    return {
        lines,   // strings, reversed order to show last shot first
        shots,   // chronological order shot 1..N
        initialHP: hp
    };
}