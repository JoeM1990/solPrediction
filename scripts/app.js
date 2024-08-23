/* Author: Jonathan Monkila */

const predictionResult = document.getElementById('prediction-result');
let dataNormalized;

const exampleLabels = [1, 0, 2, 3];  // 1 = Fertile, 0 = Non Fertile
const exampleYears = [0, 3];  // Années estimées pour atteindre la fertilité

let model = tf.sequential();

function collectData() {

    const ph = parseFloat(document.getElementById('ph').value);
    const nitrogen = parseFloat(document.getElementById('nitrogen').value);
    const phosphorus = parseFloat(document.getElementById('phosphorus').value);
    const potassium = parseFloat(document.getElementById('potassium').value);
    const moisture = parseFloat(document.getElementById('moisture').value);
    
    // Préparation des données dans un format compatible avec TensorFlow.js
    const inputData = [ph, nitrogen, phosphorus, potassium, moisture];

    // Normalisation des données (si nécessaire)
    dataNormalized = normalizeData(inputData);

    // Utilisation des données normalisées pour l'entraînement ou la prédiction
    console.log('Données normalisées:', dataNormalized);
    alert('Données normalisées');
   
}

//fonction de normalisation
function normalizeData(data) {
    const minValues = [3.0, 0, 0, 0, 0];  // valeurs minimales pour chaque caractéristique
    const maxValues = [10.0, 100, 100, 100, 100];  // valeurs maximales pour chaque caractéristique

    return data.map((value, index) => (value - minValues[index]) / (maxValues[index] - minValues[index]));
}

async function trainModel(data, labels, years) {
    // modèle séquentiel
    
    model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [data[0].length] }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));

    // Sortie pour la classification multi-classes (4 classes)
    const outputClassification = tf.layers.dense({ units: 4, activation: 'softmax' });
    model.add(outputClassification);

    // Sortie pour la régression (prédiction du temps en années)
    const outputRegression = tf.layers.dense({ units: 1 });
    model.add(outputRegression);

    // Compilation du modèle
    model.compile({
        optimizer: tf.train.adam(),
        loss: ['sparseCategoricalCrossentropy', 'meanSquaredError'],
        metrics: ['accuracy'],
    });

    // Convertir les données en tenseurs
    const xs = tf.tensor2d(data);
    const ysClassification = tf.tensor1d(labels, 'int32');  // Labels pour la classification
    const ysRegression = tf.tensor1d(years);  // Labels pour la régression

    // Entraîner le modèle
    await model.fit(xs, [ysClassification, ysRegression], {
        epochs: 50,
        batchSize: 16,
        validationSplit: 0.2,
        callbacks: tf.callbacks.earlyStopping({ monitor: 'val_loss' })
    });

    console.log('Modèle entraîné avec succès');
    alert('Modèle entraîné avec succès');
}

// Exemple d'utilisation
const exampleData = [
    [6.5, 55, 45, 30, 0.20],  // Exemple de données normalisées
    [7.2, 70, 60, 40, 0.35]
];

function predictSoilFertility(model, newInput) {

    const inputTensor = tf.tensor2d([newInput]);
    const prediction = model.predict(inputTensor);

    const predictedClass = (prediction.dataSync()[0] > 0.5) ? 1 : 0;

    const predictedYears = prediction[1].dataSync()[0];

    console.log(`Prédiction: ${predictedClass === 1 ? 'Fertile' : 'Non Fertile'}`);
    console.log(`Années estimées pour atteindre la fertilité: ${predictedYears.toFixed(2)}`);

    predictionResult.textContent = `Prédiction: ${predictedClass === 3 ? 'Fertile' : predictedClass === 2 ? 'Bientôt Fertile' : predictedClass === 1 ? 'Semi-Fertile' : 'Non Fertile'} <br> Années estimées pour atteindre la fertilité: ${predictedYears.toFixed(2)}`;
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
        return;
    }else if(!nitrogen){
        document.getElementById('error-message').textContent = "Veuillez remplir l'Azote (N)";
        document.getElementById("errorModal").style.display = "block";
        return;
    }else if(!phosphorus){
        document.getElementById('error-message').textContent = "Veuillez remplir le Phosphore (P)";
        document.getElementById("errorModal").style.display = "block";
        return;
    }else if(!potassium){
        document.getElementById('error-message').textContent = "Veuillez remplir le Potassium (K)";
        document.getElementById("errorModal").style.display = "block";
        return;
    }else if(!moisture){
        document.getElementById('error-message').textContent = "Veuillez remplir l'Humidité";
        document.getElementById("errorModal").style.display = "block";
        return;
    }

    if (action === 'collect') {
        collectData();
    } else if (action === 'train') {
        trainModel(dataNormalized, exampleLabels, exampleYears);
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

function closeErrorModal() {
    document.getElementById("errorModal").style.display = "none";
}

window.onclick = function(event) {
    const modal = document.getElementById('infoModal');
    if (event.target == modal) {
        closeModal();
    }
}



