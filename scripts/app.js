/* Author: Jonathan Monkila */

const predictionResult = document.getElementById('prediction-result');
let dataNormalized;

let model;

const exampleLabels = [0, 1, 2, 3, 4 ];  // 1 = Fertile, 0 = Non Fertile
const exampleYears = [0, 1, 2, 3, 4];  // Années estimées pour atteindre la fertilité

function collectData() {
    const ph = parseFloat(document.getElementById('ph').value);
    const nitrogen = parseFloat(document.getElementById('nitrogen').value);
    const phosphorus = parseFloat(document.getElementById('phosphorus').value);
    const potassium = parseFloat(document.getElementById('potassium').value);
    const moisture = parseFloat(document.getElementById('moisture').value);

    const inputData = [ph, nitrogen, phosphorus, potassium, moisture];

    dataNormalized = normalizeData(inputData);

    console.log('Données normalisées:', dataNormalized);

    document.getElementById('infos-message').textContent = "Les données sont collectées et normalisées";
    document.getElementById("messageModal").style.display = "block";


    setTimeout(function() {
        document.getElementById("messageModal").style.display = "none";
    }, 2000);
}

function normalizeData(data) {
    const minValues = [3.0, 0, 0, 0, 0];  // valeurs minimales pour chaque caractéristique
    const maxValues = [10.0, 100, 100, 100, 100];  // valeurs maximales pour chaque caractéristique

    return data.map((value, index) => (value - minValues[index]) / (maxValues[index] - minValues[index]));
}

async function trainModel(data, labels, years) {
    document.getElementById('infos-message').textContent = "Modèle entraîné avec succès";
    document.getElementById("messageModal").style.display = "block";

    setTimeout(function() {
        document.getElementById("messageModal").style.display = "none";
    }, 2000);

    const input = tf.input({ shape: [data[0].length] });

    const hiddenLayer1 = tf.layers.dense({ units: 32, activation: 'relu' }).apply(input);
    const hiddenLayer2 = tf.layers.dense({ units: 16, activation: 'relu' }).apply(hiddenLayer1);

    // Sortie pour la classification multi-classes (4 classes)
    const outputClassification = tf.layers.dense({ units: 4, activation: 'softmax', name: 'classification_output' }).apply(hiddenLayer2);

    // Sortie pour la régression (prédiction du temps en années)
    const outputRegression = tf.layers.dense({ units: 1, name: 'regression_output' }).apply(hiddenLayer2);

    // Création du modèle avec deux sorties
    model = tf.model({ inputs: input, outputs: [outputClassification, outputRegression] });

    // Compilation du modèle avec deux sorties
    model.compile({
        optimizer: tf.train.adam(),
        loss: {
            classification_output: 'sparseCategoricalCrossentropy',  // perte pour la sortie de classification
            regression_output: 'meanSquaredError'  // perte pour la sortie de régression
        },
        metrics: ['accuracy'],
    });

    // Convertir les données en tenseurs
    const xs = tf.tensor2d(data).cast('float32'); 
    const ysClassification = tf.tensor1d(labels, 'int32');  // Labels pour la classification
    const ysRegression = tf.tensor1d(years).cast('float32');  // Labels pour la régression, convertis en 'float32'

    // Entraîner le modèle
    await model.fit(xs, { classification_output: ysClassification, regression_output: ysRegression }, {
        epochs: 50,
        batchSize: 16,
        validationSplit: 0.2,
        callbacks: tf.callbacks.earlyStopping({ monitor: 'val_loss' })
    });

    console.log('Modèle entraîné avec succès');
}

function predictSoilFertility(model, newInput) {
    const inputTensor = tf.tensor2d([newInput]);

    const inputTensorFloat = inputTensor.cast('float32');

    const prediction = model.predict(inputTensorFloat);

   
    const predictedClassTensor = prediction[0].argMax(1);
    const predictedClassFloat = predictedClassTensor.cast('float32');

    const predictedClass = predictedClassFloat.dataSync()[0];
    const predictedYearsTensor = prediction[1];
    
    const predictedYearsFloat = predictedYearsTensor.cast('float32');
    //const predictedYears = predictedYearsFloat.dataSync()[0];
    let predictedYears = prediction[1].dataSync()[0];

    if (predictedYears < 0) {
        predictedYears = 0;
    }
    
    const wholeYears = Math.floor(predictedYears);
    const fractionalYears = predictedYears - wholeYears;

    const isLeapYear = (new Date().getFullYear() + wholeYears) % 4 === 0 && ((new Date().getFullYear() + wholeYears) % 100 !== 0 || (new Date().getFullYear() + wholeYears) % 400 === 0);
    const daysInYear = isLeapYear ? 366 : 365;
    const extraDays = Math.round(fractionalYears * daysInYear);

    // console.log(`Prédiction: ${predictedClass === 3 ? 'Fertile' : predictedClass === 2 ? 'Bientôt Fertile' : predictedClass === 1 ? 'Semi-Fertile' : 'Non Fertile'}`);
    // console.log(`Années estimées pour atteindre la fertilité: ${predictedYears.toFixed(2)}`);

    if(predictedClass === 3){
        predictionResult.innerHTML = `Prédiction: Fertile`;
    }else if (predictedClass === 2){
        predictionResult.innerHTML = `Prédiction: Bientôt Fertile <br> Années estimées pour atteindre la fertilité: ${wholeYears} ans <br> Jours estimés pour atteindre la fertilité: ${extraDays.toFixed(0)} jours`;
    }else if (predictedClass === 1){
        predictionResult.innerHTML = `Prédiction: Non Fertile <br> Années estimées pour atteindre la fertilité: ${wholeYears} ans <br> Jours estimés pour atteindre la fertilité: ${extraDays.toFixed(0)} jours`;
    }
    //predictionResult.innerHTML = `Prédiction: ${predictedClass === 3 ? 'Fertile' : predictedClass === 2 ? 'Bientôt Fertile' : predictedClass === 1 ? 'Semi-Fertile' : 'Non Fertile'}<br> Années estimées pour atteindre la fertilité: ${wholeYears} ans <br> Jours estimées pour atteindre la fertilité: ${extraDays.toFixed(0)} jours`;
}

function validateFormAndExecute(action) {
    const ph = document.getElementById('ph').value;
    const nitrogen = document.getElementById('nitrogen').value;
    const phosphorus = document.getElementById('phosphorus').value;
    const potassium = document.getElementById('potassium').value;
    const moisture = document.getElementById('moisture').value;

    if (!ph) {
        document.getElementById('error-message').textContent = "Veuillez remplir le pH du Sol";
        document.getElementById("errorModal").style.display = "block";

        setTimeout(function() {
            document.getElementById("errorModal").style.display = "none";
        }, 1000);
       
        return;
    } else if (!nitrogen) {
        document.getElementById('error-message').textContent = "Veuillez remplir l'Azote (N)";
        document.getElementById("errorModal").style.display = "block";

        setTimeout(function() {
            document.getElementById("errorModal").style.display = "none";
        }, 1000);
       
        return;
    } else if (!phosphorus) {
        document.getElementById('error-message').textContent = "Veuillez remplir le Phosphore (P)";
        document.getElementById("errorModal").style.display = "block";

        setTimeout(function() {
            document.getElementById("errorModal").style.display = "none";
        }, 1000);
        
        return;
    } else if (!potassium) {
        showAlert("Veuillez remplir le Potassium (K)");
       
        return;
    } else if (!moisture) {
        showAlert("Veuillez remplir l'Humidité")
        return;
    }

    if (action === 'collect') {
        collectData();
    } else if (action === 'train') {

        const trainingData = [
            dataNormalized,  // Échantillon normalisé de l'utilisateur
            [0.4, 0.1, 0.2, 0.3, 0.5], 
            [0.6, 0.2, 0.4, 0.1, 0.3], 
            [0.3, 0.3, 0.5, 0.2, 0.6], 
            [0.5, 0.4, 0.3, 0.4, 0.2] 
        ];

        trainModel(trainingData, exampleLabels, exampleYears);
    } else if (action === 'predict') {
        predictSoilFertility(model, dataNormalized);
    }
}

function openModal() {
    document.getElementById("infoModal").style.display = "block";
}

function closeModal() {
    document.getElementById("infoModal").style.display = "none";
}

function closeMessageModal() {
    document.getElementById("messageModal").style.display = "none";
}

function closeErrorModal() {
    document.getElementById("errorModal").style.display = "none";
}

window.onclick = function(event) {
    const modal = document.getElementById('infoModal');
    if (event.target == modal) {
        closeModal();
    }
};

function showAlert(message) {
    document.getElementById('infos-message').textContent = message;
    document.getElementById("messageModal").style.display = "block";

    setTimeout(function() {
        document.getElementById("messageModal").style.display = "none";
    }, 1000);
}
