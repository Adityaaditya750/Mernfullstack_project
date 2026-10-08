const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

exports.generateQuiz = async ({
    topic,
    difficulty,
    questionCount,
    questionTypes
}) => {

    const prompt = `
You are an expert technical assessment creator.

Generate exactly ${questionCount} questions.

==========================================
QUIZ INFORMATION
==========================================

Topic:
${topic}

Difficulty:
${difficulty}

Question Types:
${questionTypes.join(", ")}

==========================================
GENERAL RULES
==========================================

1. Generate exactly ${questionCount} questions.
2. Return ONLY valid JSON.
3. Do NOT return markdown.
4. Do NOT return comments.
5. Do NOT return explanations outside JSON.
6. Do NOT return duplicate questions.
7. Do NOT repeat the same concept.
8. Every question must be unique.

==========================================
QUESTION QUALITY RULES
==========================================

- Cover different concepts of the requested topic.
- Include theoretical and practical questions whenever possible.
- Increase difficulty gradually.
- Generate interview-quality questions.
- Questions must be technically correct.
- Questions must be realistic.
- Questions should test understanding instead of memorization.
- Explanations must be short, accurate and useful.

==========================================
DIFFICULTY RULES
==========================================

Easy:
- Basic concepts
- Definitions
- Beginner level coding

Medium:
- Practical understanding
- Scenario based questions
- Moderate coding problems

Hard:
- Advanced concepts
- Optimization
- Edge cases
- Interview level coding
- Real-world problem solving

==========================================
QUESTION TYPE RULES
==========================================

Generate questions ONLY from the selected question types.

If only one type is selected,
generate all questions using that type.

If multiple types are selected,
distribute the questions as evenly as possible.

==========================================
MCQ RULES
==========================================

- Exactly 4 options.
- Only ONE correct option.
- Options should be meaningful.
- Use correctAnswerIndex (0-3).
- Include explanation.

==========================================
CODING RULES
==========================================

- Generate executable coding problems.
- Use JavaScript unless another language is explicitly requested.
- Include starterCode.
- Include solutionCode.
- Include at least 3 meaningful test cases.
- Test cases should include normal cases and edge cases.

==========================================
LONG ANSWER RULES
==========================================

- Generate descriptive interview questions.
- Include expectedAnswer.
- Include minimumWords.
- Expected answer should be technically correct.

==========================================
TRUE/FALSE RULES
==========================================

- Statement must be factually correct or incorrect.
- Return boolean answer only.

==========================================
FILL IN THE BLANK RULES
==========================================

- Blank should test an important concept.
- Return only the missing answer.

==========================================
OUTPUT JSON FORMAT
==========================================

Return ONLY an array.

Example:

[
{
"questionType":"MCQ",
"question":"Example Question",
"options":[
"Option A",
"Option B",
"Option C",
"Option D"
],
"correctAnswerIndex":0,
"marks":2,
"explanation":"Explanation"
},

{
"questionType":"LONG",
"question":"Example Question",
"marks":10,
"longAnswer":{
"minimumWords":100,
"expectedAnswer":"Expected Answer"
}
},

{
"questionType":"CODING",
"question":"Example Question",
"marks":20,
"coding":{
"language":"JavaScript",
"starterCode":"function solution(){\\n\\n}",
"solutionCode":"function solution(){ }",
"testCases":[
{
"input":"1",
"expectedOutput":"1"
},
{
"input":"5",
"expectedOutput":"120"
},
{
"input":"0",
"expectedOutput":"1"
}
]
}
}
]

IMPORTANT:

The JSON shown above is ONLY an example of the required structure.

Do NOT copy these questions.

Generate completely new questions based on the requested topic and difficulty while following exactly the same JSON structure.
`;

    const response = await ai.models.generateContent({

        model: "gemini-2.5-flash",

        contents: prompt

    });

    return response.text;

};