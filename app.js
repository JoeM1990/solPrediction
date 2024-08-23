function collectData() {

    const ph = parseFloat(document.getElementById('ph').value);
    const nitrogen = parseFloat(document.getElementById('nitrogen').value);
    const phosphorus = parseFloat(document.getElementById('phosphorus').value);
    const potassium = parseFloat(document.getElementById('potassium').value);
    const moisture = parseFloat(document.getElementById('moisture').value);
    

    const inputData = [ph, nitrogen, phosphorus, potassium, moisture];

    const normalizedData = normalizeData(inputData);

    console.log('Données normalisées:', normalizedData);
}

// Exemple de fonction de normalisation
function normalizeData(data) {
    const minValues = [3.0, 0, 0, 0, 0];  // Exemple de valeurs minimales pour chaque caractéristique
    const maxValues = [10.0, 100, 100, 100, 100];  // Exemple de valeurs maximales pour chaque caractéristique

    return data.map((value, index) => (value - minValues[index]) / (maxValues[index] - minValues[index]));
}
