import {
    Assignment, range, Topic,
} from "./elements.js";

const BINS = [300, 285, 270, 250, 225, 205, 195, 185, 175, 170, 165, 160, 0];
const GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];

export const COURSE_CODE = "61A";

export const WARNING = "The planning functionality for this tool is not yet active - do not rely on it! Also this tool hasn't been released to students, how did you get this link! :)";

export const EXPLANATION = String.raw`what are grades anyway? [PLACEHOLDER]`;

export const ENABLE_PLANNING = true;

window.COURSE_CODE = COURSE_CODE;
window.createAssignments = createAssignments;
window.canDisplayFinalGrades = canDisplayFinalGrades;
window.computeNeededFinalScore = computeNeededFinalScore;
window.participationProvided = participationProvided;
window.WARNING = WARNING;
window.EXPLANATION = EXPLANATION;
window.ENABLE_PLANNING = ENABLE_PLANNING;

export function createAssignments() {
    return [
        Topic("Raw Score", [
            Topic("Exams", [
                Assignment("Midterm 1", 40),
                Assignment("Midterm 2", 50),
                Assignment("Final", 75),
            ]),
            Topic("Homework", [
                ...range(11).map(i => Assignment(`Homework ${i} (Total)`, 2)),
                Assignment("Homework 11 (Total)", 3),
            ]),
            Topic("Projects", [
                Topic("Hog Project", [
                    Assignment("Hog (Total)", 23),
                    Assignment("Hog Checkpoint (Total)", 1),
                ]),
                Assignment("Typing Test", 25),
                Assignment("Ants", 25),
                Assignment("Scheme", 25),
            ]),
            Topic("Section Participation", [
                ...range(1, 13).map(i => Assignment(`Discussion ${i} (Total)`, 1)),
                ...range(1, 13).map(i => Assignment(`Lab ${i} (Total)`, 1)),
            ], 10),
        ]),
        Topic("Section Participation (for clobber)", [
            ...range(1, 13).map(i => Assignment(`Discussion ${i} (Total)`, 1)),
            ...range(1, 13).map(i => Assignment(`Lab ${i} (Total)`, 1)),
        ], 20),
    ];
}

export function canDisplayFinalGrades(scores) {
    const {
        Homework, Projects, "Midterm 1": MT1, "Midterm 2": MT2, "Section Participation": Participation,
    } = scores;
    return !Number.isNaN(Homework + Projects + Participation + MT1 + MT2);
}

export function computeNeededFinalScore(scores) {
    const {
        Homework, Projects, "Midterm 1": MT1, "Midterm 2": MT2, "Section Participation": Participation,
    } = scores;

    let { "Section Participation (for clobber)": Clobber } = scores;
    if (!Clobber) {
        Clobber = 0;
    }

    const totalNonFinal = Homework
                        + Projects
                        + Participation
                        + MT1
                        + MT2
                        + examRecover(MT1, Clobber, 40)
                        + examRecover(MT2, Clobber, 50);

    console.log(totalNonFinal, MT1, Clobber, examRecover(MT1, Clobber, 50));

    const needed = [];
    const grades = [];

    for (const [bin, i] of BINS.map((val, index) => [val, index])) {
        const neededScore = Math.max(0, bin - totalNonFinal);
        if (neededScore <= 75) {
            needed.push(neededScore);
            grades.push(GRADES[i]);
        }
        if (neededScore === 0) {
            break;
        }
    }

    return [grades, needed];
}

function examRecover(examScore, participation, maxExamScore, cap = 20) {
    const halfScore = maxExamScore / 2;
    const maxRecovery = Math.max(0, (halfScore - examScore) / 2);
    const recoveryRatio = Math.min(participation, cap) / cap;
    return maxRecovery * recoveryRatio;
}

export function participationProvided(scores) {
    const { "Section Participation (for clobber)": Participation } = scores;
    return !Number.isNaN(Participation);
}
