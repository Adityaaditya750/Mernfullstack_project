const timers = new Map();

/*
====================================
Start Timer
====================================
*/

exports.startTimer = (

    io,

    roomCode,

    duration,

    onFinish

) => {

    let timeLeft = duration;

    io.to(roomCode).emit(

        "timer",

        {

            timeLeft

        }

    );

    const interval = setInterval(() => {

        timeLeft--;

        io.to(roomCode).emit(

            "timer",

            {

                timeLeft

            }

        );

        if (timeLeft <= 0) {

            clearInterval(interval);

            timers.delete(roomCode);

            onFinish();

        }

    }, 1000);

    timers.set(

        roomCode,

        interval

    );

};

/*
====================================
Stop Timer
====================================
*/

exports.stopTimer = (roomCode) => {

    const interval = timers.get(roomCode);

    if (interval) {

        clearInterval(interval);

        timers.delete(roomCode);

    }

};