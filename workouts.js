// Exercise descriptions for common movements
const exerciseDescriptions = {
    "wall squat": "Stand facing a wall, feet shoulder-width apart, toes touching the wall. Squat down while keeping chest up and knees tracking over toes. Helps improve squat form and mobility.",
    "goblet squat": "Hold a kettlebell or dumbbell at chest height. Squat down keeping elbows inside knees. Great for teaching proper squat mechanics.",
    "front squat": "Barbell rests on front of shoulders in rack position. Squat down keeping torso upright and elbows high. Targets quads and core.",
    "back squat": "Barbell on upper back/traps. Fundamental lower body strength movement targeting quads, glutes, and hamstrings.",
    "ohs": "Overhead Squat - Hold barbell overhead with wide grip while performing a full squat. Tests and builds mobility and stability.",
    "jump squat": "Explosive squat where you jump at the top. Builds power and athleticism.",
    "tuck jump": "Jump and bring knees to chest at peak height. Plyometric exercise for explosive power.",
    "sl squat": "Single Leg Squat - Squat on one leg, often to a box. Builds unilateral strength and balance.",
    "deck squat": "Roll back on ground, then roll forward and stand up without using hands. Tests mobility and strength.",
    "deadlift": "Lift barbell from floor to standing position. Fundamental posterior chain exercise targeting hamstrings, glutes, and back.",
    "sldl": "Straight/Stiff Leg Deadlift - Deadlift variation with minimal knee bend, targeting hamstrings.",
    "snatch grip dl": "Deadlift with extra-wide grip. Increases range of motion and upper back engagement.",
    "power clean": "Explosive lift from floor to rack position without full squat. Olympic lift variation for power development.",
    "hang clean": "Clean starting from hang position (above knees). Develops explosive hip power.",
    "clean hi-pull": "Pull the bar explosively from floor to chest height without catching. Builds pulling power for cleans.",
    "push press": "Press overhead using leg drive to initiate movement. Allows heavier loads than strict press.",
    "bench press": "Lying on bench, press barbell from chest to lockout. Primary horizontal pressing movement.",
    "floor press": "Bench press performed lying on floor. Limits range of motion, good for lockout strength.",
    "hspu": "Handstand Push-Up - Inverted pressing movement against wall or freestanding. Advanced shoulder/tricep exercise.",
    "pull-up": "Hang from bar and pull chin over bar. Fundamental upper body pulling exercise.",
    "pull-up ladder": "1 rep, then 2 reps, then 3, etc. Great for volume accumulation.",
    "push-up ladder": "Push-ups in ascending rep scheme (1, 2, 3, etc.).",
    "ring push-up": "Push-up on gymnastic rings. Increases instability and muscle activation.",
    "ring dip": "Dip performed on gymnastic rings. Challenging pushing movement.",
    "plank pull": "From plank position, pull a weight across the floor. Core stability exercise.",
    "flr": "Front Leaning Rest - Push-up hold position. Builds core and shoulder endurance.",
    "ring support": "Hold body supported on rings with arms straight. Builds shoulder stability.",
    "burpee": "Full body exercise: squat down, kick feet back, push-up, jump feet in, jump up. High intensity conditioning.",
    "burpee/pull-up": "Burpee followed by a pull-up. Combines conditioning with pulling strength.",
    "burpee/broad jump": "Burpee with a horizontal jump forward instead of vertical.",
    "kb swing": "Kettlebell swing - hip hinge movement swinging KB between legs and to eye level. Builds hip power and conditioning.",
    "kb clean": "Clean a kettlebell to rack position. Kettlebell-specific Olympic lift variation.",
    "kb clean & press": "Clean KB to shoulder then press overhead. Full body KB movement.",
    "box jump": "Jump onto a box/platform. Builds explosive leg power.",
    "split jump": "Lunge position, jump and switch legs in air. Plyometric leg exercise.",
    "frog hop": "Deep squat position, hop forward like a frog. Builds leg power and mobility.",
    "lunge": "Step forward into split stance, lower back knee toward ground. Unilateral leg exercise.",
    "walking lunge": "Continuous lunges moving forward. Builds leg endurance and strength.",
    "step-up": "Step onto elevated surface, stand fully, step down. Unilateral leg exercise.",
    "sit-up": "Lying on back, flex spine to bring torso to upright position. Core exercise.",
    "atomic sit-up": "Sit-up variation with added hip flexion at top. More challenging core exercise.",
    "kte": "Knees to Elbows - Hanging from bar, bring knees to elbows. Core exercise.",
    "feet-to-hands": "Hanging from bar, bring feet all the way to hands. Advanced core exercise.",
    "tgu": "Turkish Get-Up - Complex movement from lying to standing while holding weight overhead. Full body stability exercise.",
    "get-up": "See TGU - Turkish Get-Up.",
    "man-maker": "Burpee with dumbbells including renegade rows and press. Brutal full-body exercise.",
    "upright row": "Pull weight from waist to chin, elbows high. Shoulder exercise.",
    "front raise": "Raise weight in front of body to shoulder height. Front delt exercise.",
    "bent-over row": "Hinged at hips, pull weight to torso. Back exercise.",
    "hi-pull": "Explosive pull from hip to chest height. Power development.",
    "fspp": "Front Squat Push Press - Front squat followed by push press. Combination movement.",
    "shoulder dislocate": "Using stick/band, pass it from front to back over head with straight arms. Shoulder mobility drill.",
    "six-way bb complex": "Barbell complex: Deadlift + Row + Hang Clean + Front Squat + Push Press + Back Squat + Push-up. Don't let go of the bar.",
    "dumbbell complex": "Series of dumbbell exercises performed without rest. Great for conditioning.",
    "breathing ladder": "Rep scheme where you take number of breaths equal to reps just completed between sets.",
    "strip set": "Perform reps to failure, reduce weight, continue. Intensity technique.",
    "finger curl": "Grip exercise - curl weight using only finger flexion.",
    "row": "Rowing machine cardio. Low impact, full body conditioning.",
    "skierg": "Ski ergometer - upper body focused cardio machine mimicking cross-country skiing.",
    "airdyne": "Air resistance bike. Full body cardio with arms and legs."
};

// Workout data (will be populated from JSON)
let workoutData = null;

// Load workout data
async function loadWorkoutData() {
    try {
        const response = await fetch('workouts.json');
        workoutData = await response.json();
        return workoutData;
    } catch (error) {
        console.error('Error loading workout data:', error);
        return null;
    }
}

// Get exercise description if available
function getExerciseDescription(text) {
    const lowerText = text.toLowerCase();
    for (const [exercise, description] of Object.entries(exerciseDescriptions)) {
        if (lowerText.includes(exercise)) {
            return { exercise, description };
        }
    }
    return null;
}

// Determine workout type from content
function getWorkoutType(content) {
    const text = content.join(' ').toLowerCase();

    if (text.includes('rest') && content.length <= 3) {
        return 'Rest / Active Recovery';
    }
    if (text.includes('row') && text.includes('minute') && !text.includes('then')) {
        return 'Cardio';
    }
    if (text.includes('run') || text.includes('bike') || text.includes('swim')) {
        return 'Cardio';
    }
    if (text.includes('1rm') || text.includes('heavy')) {
        return 'Strength';
    }
    if (text.includes('complex')) {
        return 'Complex';
    }
    if (text.includes('for time') || text.includes('amrap') || text.includes('max rounds')) {
        return 'Metcon';
    }
    if (text.includes('ladder')) {
        return 'Ladder';
    }
    return 'Mixed';
}

// Get preview text for workout card
function getWorkoutPreview(content, maxLines = 4) {
    const filteredContent = content.filter(line =>
        line.toLowerCase() !== 'workout:' &&
        line.toLowerCase() !== 'then:' &&
        line.trim() !== ''
    );
    return filteredContent.slice(0, maxLines).join('\n');
}
