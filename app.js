/* Author: Jonathan Monkila */

function collectData() {

    const ph = parseFloat(document.getElementById('ph').value);
    const nitrogen = parseFloat(document.getElementById('nitrogen').value);
    const phosphorus = parseFloat(document.getElementById('phosphorus').value);
    const potassium = parseFloat(document.getElementById('potassium').value);
    const moisture = parseFloat(document.getElementById('moisture').value);
    
    // Préparation des données dans un format compatible avec TensorFlow.js
    const inputData = [ph, nitrogen, phosphorus, potassium, moisture];

    // Normalisation des données (si nécessaire)
    const normalizedData = normalizeData(inputData);

    // Utilisation des données normalisées pour l'entraînement ou la prédiction
    console.log('Données normalisées:', normalizedData);
}

//fonction de normalisation
function normalizeData(data) {
    const minValues = [3.0, 0, 0, 0, 0];  // valeurs minimales pour chaque caractéristique
    const maxValues = [10.0, 100, 100, 100, 100];  // valeurs maximales pour chaque caractéristique

    return data.map((value, index) => (value - minValues[index]) / (maxValues[index] - minValues[index]));
}

async function trainModel(data, labels) {
    // modèle séquentiel
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [data[0].length] }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' })); // Utiliser 'sigmoid' pour la classification binaire

    // Compiler le modèle
    model.compile({
        optimizer: tf.train.adam(),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
    });

    // Convertir les données en tenseurs
    const xs = tf.tensor2d(data);
    const ys = tf.tensor2d(labels, [labels.length, 1]);

    // Entraîner le modèle
    await model.fit(xs, ys, {
        epochs: 50,
        batchSize: 16,
        validationSplit: 0.2,
        callbacks: tf.callbacks.earlyStopping({ monitor: 'val_loss' })
    });

    console.log('Modèle entraîné avec succès');
}

// Exemple d'utilisation
const exampleData = [
    [6.5, 55, 45, 30, 0.20],  // Exemple de données normalisées
    [7.2, 70, 60, 40, 0.35]
];
const exampleLabels = [1, 0];  // 1 = Fertile, 0 = Non Fertile

trainModel(exampleData, exampleLabels);
