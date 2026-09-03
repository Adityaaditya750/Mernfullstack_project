const Question = require("../model/Question");

const {
    executeCode
} = require("./codingService");

const {
    GoogleGenAI
} = require("@google/genai");


/*
=====================================
Gemini Setup
=====================================
*/

const ai = new GoogleGenAI({

    apiKey: process.env.GEMINI_API_KEY

});


/*
=====================================
Evaluate One Answer
=====================================
*/

const evaluateAnswer = async (

    questionId,

    answer

) => {

    const question = await Question.findById(questionId);

    if (!question) {

        throw new Error("Question not found");

    }


    let result = {

        obtainedMarks: 0,

        isCorrect: false,

        aiFeedback: "",

        evaluatedByAI: false,

        timeTaken: answer.timeTaken || 0

    };


    /*
    =====================================
    MCQ
    =====================================
    */

    switch (question.questionType) {

        case "MCQ":

            if (

                answer.selectedOption ===
                question.correctAnswerIndex

            ) {

                result.obtainedMarks = question.marks;

                result.isCorrect = true;

            }

            break;


        /*
        =====================================
        TRUE / FALSE
        =====================================
        */

        case "TRUE_FALSE":

            if (

                answer.trueFalseAnswer ===
                question.trueFalse.answer

            ) {

                result.obtainedMarks = question.marks;

                result.isCorrect = true;

            }

            break;


        /*
        =====================================
        FILL BLANK
        =====================================
        */

        case "FILL":

            if (

                typeof answer.fillBlankAnswer === "string" &&

                answer.fillBlankAnswer
                    .trim()
                    .toLowerCase()

                ===

                question.fillBlank.answer
                    .trim()
                    .toLowerCase()

            ) {

                result.obtainedMarks = question.marks;

                result.isCorrect = true;

            }

            break;


        /*
        =====================================
        CODING
        =====================================
        */

        case "CODING":

            result = await evaluateCodingAnswer(

                question,

                answer

            );

            break;


        /*
        =====================================
        LONG ANSWER
        =====================================
        */

        case "LONG":

            result.aiFeedback =

                "Pending AI Evaluation";

            break;


        default:

            throw new Error(

                `Unsupported question type: ${question.questionType}`

            );

    }


    return result;

};


/*
=====================================
Evaluate Coding Answer
=====================================
*/

const evaluateCodingAnswer = async (

    question,

    answer

) => {

    /*
    -------------------------------------
    Validate Student Code
    -------------------------------------
    */

    if (

        !answer.codingAnswer ||

        !answer.codingAnswer.trim()

    ) {

        return {

            obtainedMarks: 0,

            isCorrect: false,

            aiFeedback: "No code submitted.",

            evaluatedByAI: false,

            timeTaken: answer.timeTaken || 0

        };

    }


    const coding = question.coding;


    if (!coding) {

        throw new Error(

            "Coding configuration not found"

        );

    }


    if (!coding.language) {

        throw new Error(

            "Programming language not specified"

        );

    }


    /*
    -------------------------------------
    Test Cases
    -------------------------------------
    */

    const testCases = coding.testCases || [];


    if (testCases.length === 0) {

        return await evaluateCodingWithGeminiOnly(

            question,

            answer

        );

    }


    /*
    -------------------------------------
    Run Student Code
    Against Every Test Case
    -------------------------------------
    */

    const testResults = [];

    let passedTests = 0;


    for (const testCase of testCases) {

        try {

            const execution = await executeCode(

                coding.language,

                answer.codingAnswer,

                testCase.input || ""

            );


            const actualOutput = (

                execution?.run?.stdout || ""

            ).trim();


            const expectedOutput = (

                testCase.expectedOutput || ""

            ).trim();


            const stderr = (

                execution?.run?.stderr || ""

            ).trim();


            const executionCode =

                execution?.run?.code;


            const passed =

                executionCode === 0 &&

                actualOutput === expectedOutput;


            if (passed) {

                passedTests++;

            }


            testResults.push({

                passed,

                input: testCase.isHidden

                    ? "[HIDDEN]"

                    : testCase.input,

                expectedOutput: testCase.isHidden

                    ? "[HIDDEN]"

                    : expectedOutput,

                actualOutput: testCase.isHidden

                    ? "[HIDDEN]"

                    : actualOutput,

                error: stderr

            });

        }

        catch (error) {

            testResults.push({

                passed: false,

                input: testCase.isHidden

                    ? "[HIDDEN]"

                    : testCase.input,

                expectedOutput: testCase.isHidden

                    ? "[HIDDEN]"

                    : testCase.expectedOutput,

                actualOutput: "",

                error: error.message

            });

        }

    }


    /*
    -------------------------------------
    Calculate Runtime Marks
    -------------------------------------
    */

    const totalTests = testCases.length;


    const runtimePercentage =

        totalTests === 0

            ? 0

            : passedTests / totalTests;


    let runtimeMarks =

        question.marks * runtimePercentage;


    /*
    -------------------------------------
    Gemini Analysis
    -------------------------------------
    */

    const aiResult =

        await evaluateCodingWithGemini(

            question,

            answer,

            testResults,

            passedTests,

            totalTests

        );


    /*
    -------------------------------------
    Final Decision
    -------------------------------------
    */

    let finalMarks = runtimeMarks;

    let isCorrect = false;


    /*
    All runtime tests passed AND
    Gemini agrees with solution
    */

    if (

        passedTests === totalTests &&

        aiResult.correct === true

    ) {

        finalMarks = question.marks;

        isCorrect = true;

    }


    /*
    Gemini found a requirement violation
    */

    else if (

        aiResult.correct === false

    ) {

        /*
        Keep runtime-based partial marks,
        but don't mark completely correct.
        */

        isCorrect = false;

    }


    /*
    -------------------------------------
    Final Feedback
    -------------------------------------
    */

    let feedback = aiResult.feedback || "";


    feedback += `\n\nTest Cases Passed: ${passedTests}/${totalTests}`;


    return {

        obtainedMarks: Number(

            finalMarks.toFixed(2)

        ),

        isCorrect,

        aiFeedback: feedback,

        evaluatedByAI: true,

        timeTaken: answer.timeTaken || 0,

        codingResult: {

            passedTests,

            totalTests,

            testResults

        }

    };

};


/*
=====================================
Gemini Coding Evaluation
=====================================
*/

const evaluateCodingWithGemini = async (

    question,

    answer,

    testResults,

    passedTests,

    totalTests

) => {

    try {

        const coding = question.coding;


        const prompt = `

You are an expert programming evaluator.

Evaluate the student's coding solution.

QUESTION:
${question.question}

PROGRAMMING LANGUAGE:
${coding.language}

CONSTRAINTS:
${coding.constraints?.length

    ? coding.constraints.join("\n")

    : "No special constraints specified."

}

REFERENCE SOLUTION:
${coding.solutionCode || "No reference solution provided."}

STUDENT CODE:
${answer.codingAnswer}

RUNTIME TEST RESULTS:
Passed: ${passedTests}/${totalTests}

The runtime test results are authoritative for execution.
Use the pass count to understand whether the submitted code
actually works on the provided tests.


Your task:

1. Understand the question.
2. Understand the reference solution.
3. Understand the student's code.
4. Determine whether the student's algorithm solves the actual problem.
5. Do NOT require the student's code to be identical to the reference solution.
6. Different valid algorithms should be accepted.
7. Check all stated constraints.
8. Consider edge cases.
9. Consider whether the runtime results support the solution.
10. Give concise useful feedback.

Return ONLY valid JSON in exactly this format:

{
    "correct": true,
    "feedback": "Short explanation of the evaluation.",
    "constraintViolation": false
}

If the solution is logically correct and satisfies the requirements,
set correct to true.

If the solution is incorrect or violates an important requirement,
set correct to false.

`;


        const response = await ai.models.generateContent({

            model: "gemini-2.5-flash",

            contents: prompt,

            config: {

                responseMimeType: "application/json"

            }

        });


        const text = response.text;


        const parsed = JSON.parse(text);


        return {

            correct:

                parsed.correct === true,

            feedback:

                parsed.feedback || "",

            constraintViolation:

                parsed.constraintViolation === true

        };

    }

    catch (error) {

        console.error(

            "Gemini Coding Evaluation Error:",

            error.message

        );


        /*
        -------------------------------------
        Gemini failure should NOT destroy
        the coding evaluation.

        Runtime tests are still available.
        -------------------------------------
        */

        return {

            correct: passedTests === totalTests,

            feedback:

                "Automatic code analysis was unavailable. Evaluation was based on runtime test results.",

            constraintViolation: false

        };

    }

};


/*
=====================================
Gemini Only Coding Evaluation
=====================================
*/

const evaluateCodingWithGeminiOnly = async (

    question,

    answer

) => {

    const coding = question.coding;


    try {

        const prompt = `

You are an expert programming evaluator.

Evaluate the student's code.

QUESTION:
${question.question}

LANGUAGE:
${coding.language}

CONSTRAINTS:
${coding.constraints?.length

    ? coding.constraints.join("\n")

    : "No special constraints."

}

REFERENCE SOLUTION:
${coding.solutionCode || "No reference solution available."}

STUDENT CODE:
${answer.codingAnswer}

Determine whether the student correctly solves the question.

The student's code does NOT need to match the reference solution.

Return ONLY JSON:

{
    "correct": true,
    "marksPercentage": 100,
    "feedback": "Explanation"
}

`;


        const response = await ai.models.generateContent({

            model: "gemini-2.5-flash",

            contents: prompt,

            config: {

                responseMimeType: "application/json"

            }

        });


        const parsed = JSON.parse(

            response.text

        );


        const percentage = Math.max(

            0,

            Math.min(

                100,

                Number(

                    parsed.marksPercentage || 0

                )

            )

        );


        return {

            obtainedMarks:

                Number(

                    (

                        question.marks *

                        percentage /

                        100

                    ).toFixed(2)

                ),

            isCorrect:

                parsed.correct === true,

            aiFeedback:

                parsed.feedback || "",

            evaluatedByAI: true,

            timeTaken: answer.timeTaken || 0

        };

    }

    catch (error) {

        console.error(

            "Gemini Evaluation Error:",

            error.message

        );


        return {

            obtainedMarks: 0,

            isCorrect: false,

            aiFeedback:

                "AI evaluation failed. Please try again.",

            evaluatedByAI: true,

            timeTaken: answer.timeTaken || 0

        };

    }

};


/*
=====================================
Exports
=====================================
*/

module.exports = {

    evaluateAnswer

};