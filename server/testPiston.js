const {
    executeCode
} = require("./service/codingService");

async function test() {

    try {

        const result = await executeCode(

            "python",

            `
s = input()
print(s[::-1])
`,

            "hello world"

        );

        console.log(

            JSON.stringify(

                result,

                null,

                2

            )

        );

    }

    catch (error) {

        console.error(

            error.message

        );

    }

}

test();