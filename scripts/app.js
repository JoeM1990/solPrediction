/**
 * @author Joe Monkila
 */

const predictionResult = document.getElementById('prediction-result');
let dataNormalized;

let model;


const exampleLabels = [0, 1, 2, 3, 4];  // 1 = Fertile ...
const exampleYears = [0, 1, 2, 3, 4];  // Années estimées pour atteindre la fertilité


document.addEventListener('DOMContentLoaded', async function () {
    await fetch('./config.json',
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    )
        .then(response => response.json())
        .then(data => {
            config = data;
        })
        .catch(error => console.error('Erreur de chargement de la configuration :', error));
});

function collectData() {
    const ph = parseFloat(document.getElementById('ph').value);
    const nitrogen = parseFloat(document.getElementById('nitrogen').value);
    const phosphorus = parseFloat(document.getElementById('phosphorus').value);
    const potassium = parseFloat(document.getElementById('potassium').value);
    const moisture = parseFloat(document.getElementById('moisture').value);

    const inputData = [ph, nitrogen, phosphorus, potassium, moisture];

    dataNormalized = normalizeData(inputData);
    console.log('Données normalisées:', dataNormalized);

    showAlert("Les données sont collectées et normalisées");
}

function normalizeData(data) {
    const minValues = [6, 25, 10, 150, 50];  // valeurs minimales pour chaque caractéristique
    const maxValues = [7, 50, 50, 250, 80];  // valeurs maximales pour chaque caractéristique

    return data.map((value, index) => (value - minValues[index]) / (maxValues[index] - minValues[index]));
}

async function trainModel(data, labels, years) {
    showAlert("Modèle entraîné avec succès");

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

// function predictSoilFertility(model, newInput) {
//     const inputTensor = tf.tensor2d([newInput]);

//     const inputTensorFloat = inputTensor.cast('float32');

//     const prediction = model.predict(inputTensorFloat);


//     const predictedClassTensor = prediction[0].argMax(1);
//     const predictedClassFloat = predictedClassTensor.cast('float32');

//     const predictedClass = predictedClassFloat.dataSync()[0];
//     const predictedYearsTensor = prediction[1];

//     const predictedYearsFloat = predictedYearsTensor.cast('float32');
//     //const predictedYears = predictedYearsFloat.dataSync()[0];
//     let predictedYears = prediction[1].dataSync()[0];

//     if (predictedYears < 0) {
//         predictedYears = 0;
//     }

//     const wholeYears = Math.floor(predictedYears);
//     const fractionalYears = predictedYears - wholeYears;

//     const isLeapYear = (new Date().getFullYear() + wholeYears) % 4 === 0 && ((new Date().getFullYear() + wholeYears) % 100 !== 0 || (new Date().getFullYear() + wholeYears) % 400 === 0);
//     const daysInYear = isLeapYear ? 366 : 365;
//     const extraDays = Math.round(fractionalYears * daysInYear);

//     if (predictedClass === 3) {
//         predictionResult.innerHTML = `Prédiction: Fertile`;

//         addPredictionToDb('Fertile', 'Aucun');

//     } else if (predictedClass === 2) {
//         predictionResult.innerHTML = `Prédiction: Bientôt Fertile <br> Années estimées pour atteindre la fertilité: ${wholeYears} ans <br> Jours estimés pour atteindre la fertilité: ${extraDays.toFixed(0)} jours`;

//         addPredictionToDb('Bientôt Fertile', 'Jours estimés pour atteindre la fertilité:' + extraDays.toFixed(0) + 'jours')

//     } else if (predictedClass === 1) {
//         predictionResult.innerHTML = `Prédiction: Non Fertile <br> Années estimées pour atteindre la fertilité: ${wholeYears} ans <br> Jours estimés pour atteindre la fertilité: ${extraDays.toFixed(0)} jours`;

//         addPredictionToDb('Non Fertile', 'Jours estimés pour atteindre la fertilité:' + extraDays.toFixed(0) + 'jours')
//     }

//     displayResults();
//     document.getElementById("results-pred").style.display = "block";
//     //predictionResult.innerHTML = `Prédiction: ${predictedClass === 3 ? 'Fertile' : predictedClass === 2 ? 'Bientôt Fertile' : predictedClass === 1 ? 'Semi-Fertile' : 'Non Fertile'}<br> Années estimées pour atteindre la fertilité: ${wholeYears} ans <br> Jours estimées pour atteindre la fertilité: ${extraDays.toFixed(0)} jours`;
// }

function predictSoilFertility(model, newInput) {
    const inputTensor = tf.tensor2d([newInput]);
    const inputTensorFloat = inputTensor.cast('float32');
    
    const prediction = model.predict(inputTensorFloat);
    const predictedClassTensor = prediction[0].argMax(1);
    const predictedClassFloat = predictedClassTensor.cast('float32');
    const predictedClass = predictedClassFloat.dataSync()[0];
    const predictedYearsTensor = prediction[1];
    const predictedYearsFloat = predictedYearsTensor.cast('float32');
    
    let predictedYears = predictedYearsFloat.dataSync()[0];
    if (predictedYears < 0) predictedYears = 0;

    const wholeYears = Math.floor(predictedYears);
    const fractionalYears = predictedYears - wholeYears;

    const isLeapYear = (new Date().getFullYear() + wholeYears) % 4 === 0 && 
                       ((new Date().getFullYear() + wholeYears) % 100 !== 0 || 
                        (new Date().getFullYear() + wholeYears) % 400 === 0);
    const daysInYear = isLeapYear ? 366 : 365;
    const extraDays = Math.round(fractionalYears * daysInYear);

    // Recommandations basées sur les paramètres
    const recommendations = generateRecommendations(newInput);

    if (predictedClass === 3) {
        predictionResult.innerHTML = `Prédiction: Fertile<br>Aucune modification nécessaire.`;
        addPredictionToDb('Fertile', 'Aucun changement nécessaire');
    } else if (predictedClass === 2) {
        predictionResult.innerHTML = `Prédiction: Bientôt Fertile<br>Années estimées: ${wholeYears} ans, ${extraDays} jours<br>${recommendations}`;
        addPredictionToDb('Bientôt Fertile', 'Jours estimés pour atteindre la fertilité:' + extraDays.toFixed(0) + 'jours');
    } else if (predictedClass === 1) {
        predictionResult.innerHTML = `Prédiction: Non Fertile<br>Années estimées: ${wholeYears} ans, ${extraDays} jours<br>${recommendations}`;
        addPredictionToDb('Non Fertile', 'Jours estimés pour atteindre la fertilité:' + extraDays.toFixed(0) + 'jours')
    }

    displayResults();
    document.getElementById("results-pred").style.display = "block";
}


function generateRecommendations(inputData) {
    const [ph, nitrogen, phosphorus, potassium, moisture] = inputData;

    let recommendations = 'Pour améliorer la fertilité du sol :<br>';
    
    if (ph < 6.5) {
        recommendations += '• Augmenter le pH en ajoutant de la chaux agricole.<br>';
    } else if (ph > 7.5) {
        recommendations += '• Réduire le pH avec du soufre ou de la matière organique.<br>';
    }

    if (nitrogen < 50) {
        recommendations += '• Ajouter de l\'azote, par exemple via des engrais riches en N.<br>';
    }

    if (phosphorus < 30) {
        recommendations += '• Ajouter du phosphore avec un engrais phosphaté.<br>';
    }

    if (potassium < 40) {
        recommendations += '• Augmenter le potassium avec des engrais potassiques.<br>';
    }

    if (moisture < 20) {
        recommendations += '• Augmenter l\'humidité du sol via l\'irrigation ou l\'utilisation de paillis.<br>';
    }

    return recommendations === 'Pour améliorer la fertilité du sol :<br>' 
           ? 'Aucune amélioration nécessaire.' 
           : recommendations;
}

function validateFormAndExecute(action) {
    const ph = document.getElementById('ph').value;
    const nitrogen = document.getElementById('nitrogen').value;
    const phosphorus = document.getElementById('phosphorus').value;
    const potassium = document.getElementById('potassium').value;
    const moisture = document.getElementById('moisture').value;

    if (!ph ) {
        showAlert("Veuillez remplir le pH du Sol");
        return;
    } else if(ph.length>3){
        showAlert("Le pH ne peut pas depasser 2 caracteres");
        return;
    }
    else if (!nitrogen) {
        showAlert("Veuillez remplir l'Azote (N)");
        return;
    } else if(nitrogen.length>2){
        showAlert("Le nitrogen ne peut pas depasser 2 caracteres");
        return;
    }else if (!phosphorus) {
        showAlert("Veuillez remplir le Phosphore (P)");

        return;
    } else if(phosphorus.length>2){
        showAlert("Le phosphore ne peut pas depasser 2 caracteres");
        return;
    }else if (!potassium) {
        showAlert("Veuillez remplir le Potassium (K)");
        return;
    } else if(potassium.length>3){
        showAlert("Le potassium ne peut pas depasser 3 caracteres");
        return;
    }
    else if (!moisture) {
        showAlert("Veuillez remplir l'Humidité")
        return;
    }else if(moisture.length>2){
        showAlert("L'humiidite ne peut pas depasser 2 caracteres");
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

function openModalStory() {
    document.getElementById("storyModal").style.display = "block";
}

function closeModalStory() {
    document.getElementById("storyModal").style.display = "none";
}

function openModalRec() {
    document.getElementById("recModal").style.display = "block";
}

function closeModalRec() {
    document.getElementById("recModal").style.display = "none";
}

function openModalBib() {
    document.getElementById("bibModal").style.display = "block";
}

function closeModalBib() {
    document.getElementById("bibModal").style.display = "none";
}

function closeMessageModal() {
    document.getElementById("messageModal").style.display = "none";
}

function closeErrorModal() {
    document.getElementById("errorModal").style.display = "none";
}

window.onclick = function (event) {
    const modal = document.getElementById('infoModal');

    if (event.target == modal) {
        closeModal();
    }
};

function openGraphiqueModal() {
    document.getElementById("results-pred").style.display = "block";
}

function closeGraphiqueModal() {
    document.getElementById("results-pred").style.display = "none";
}

function showAlert(message) {

    document.getElementById('infos-message').textContent = message;
    document.getElementById("messageModal").style.display = "block";

    setTimeout(function () {
        document.getElementById("messageModal").style.display = "none";
    }, 1000);

}

function logout() {

    if (confirm("Voulez-vous vous deconnecter")) {
        localStorage.removeItem('isAuthenticated');
        window.location.href = 'index.html';
    }

}

async function addPredictionToDb(result, predict) {
    const apiUrl = config.apiUrl
    const formData = {
        'resultat': result,
        'prediction': predict,
        'date': new Date().toLocaleString()
    };

    await fetch(`${apiUrl}/solPrediction`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
    })
        .then(response => response.json())
        .then(data => {
            fetchData();
        })
        .catch(error => {
            console.log('error :', error);
            showAlert('Error: ' + error, 1500);
        });
}


function fetchData() {
    const apiUrl = config.apiUrl

    fetch(`${apiUrl}/solPrediction`)
        .then(response => response.json())
        .then(data => {

            console.log(data);

            const tableBody = document.querySelector('#data-table tbody');
            tableBody.innerHTML = '';

            data.forEach(item => {
                const row = `
            <tr>
              <td>${item.date}</td>
              <td>${item.resultat}</td>
              <td>${item.prediction}</td>
            </tr>
          `;
                tableBody.innerHTML += row;
            });
        })
        .catch(error => console.error('Error fetching data:', error));
}

function displayResults() {
    const ctx = document.getElementById('sol-chart').getContext('2d');

    const ph = parseFloat(document.getElementById('ph').value);
    const nitrogen = parseFloat(document.getElementById('nitrogen').value);
    const phosphorus = parseFloat(document.getElementById('phosphorus').value);
    const potassium = parseFloat(document.getElementById('potassium').value);
    const moisture = parseFloat(document.getElementById('moisture').value);

    const labels = ['pH', 'N', 'P', 'K', 'Humidite'];
    const solData =[ph, nitrogen, phosphorus, potassium, moisture];


    if (window.salesChart) {
        window.salesChart.destroy();
    }

    window.salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Result',
                data: solData,
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                fill: true, 
                backgroundColor: 'rgba(75, 192, 192, 0.2)', 
                tension: 0.4
            }]

        },
        options: {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Elements'
                    }
                },
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Valeurs'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });

}


window.onload = fetchData;
