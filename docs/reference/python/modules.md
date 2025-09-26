# ML Engine Modules

## Feature Extraction

Feature Extraction for Entity Resolution
Generates numerical features for entity matching

### *class* feature_extraction.FeatureExtractor

Bases: `object`

Feature extraction for entity resolution

#### extract_features(entity1, entity2)

Extract all features for an entity pair

* **Parameters:**
  * **entity1** (*Dict* *[**str* *,* *Any* *]*) – First entity data
  * **entity2** (*Dict* *[**str* *,* *Any* *]*) – Second entity data
* **Returns:**
  Dictionary of feature names to values
* **Return type:**
  *Dict*[str, float]

### feature_extraction.main()

Command line interface for feature extraction

## Model Training

Model Training Pipeline for Entity Resolution
Trains machine learning models using scikit-learn

### *class* train_model.ModelTrainer

Bases: `object`

Model training pipeline for entity resolution

#### cross_validate(X, y, model_type, hyperparameters, cv=5)

Perform cross-validation

* **Parameters:**
  * **X** (*numpy.ndarray*) – Feature matrix
  * **y** (*numpy.ndarray*) – Labels
  * **model_type** (*str*) – Type of model
  * **hyperparameters** (*Dict* *[**str* *,* *Any* *]*) – Model parameters
  * **cv** (*int*) – Number of cross-validation folds
* **Returns:**
  Cross-validation scores
* **Return type:**
  *Dict*[str, float]

#### evaluate_model(pipeline, X_test, y_test)

Evaluate trained model

* **Parameters:**
  * **pipeline** (*sklearn.pipeline.Pipeline*) – Trained model pipeline
  * **X_test** (*numpy.ndarray*) – Test features
  * **y_test** (*numpy.ndarray*) – Test labels
* **Returns:**
  Dictionary with evaluation metrics
* **Return type:**
  *Dict*[str, *Any*]

#### load_model(model_path)

Load model from disk

* **Parameters:**
  **model_path** (*str*) – Path to saved model
* **Returns:**
  Loaded model pipeline
* **Return type:**
  sklearn.pipeline.Pipeline

#### prepare_data(examples)

Prepare training data from examples

* **Parameters:**
  **examples** (*List* *[**Dict* *[**str* *,* *Any* *]* *]*) – List of training examples with features
* **Returns:**
  Tuple of (features, labels)
* **Return type:**
  *Tuple*[numpy.ndarray, numpy.ndarray]

#### save_model(pipeline, output_path)

Save trained model to disk

* **Parameters:**
  * **pipeline** (*sklearn.pipeline.Pipeline*) – Trained model pipeline
  * **output_path** (*str*) – Path to save the model
* **Return type:**
  None

#### train_model(X, y, model_type, hyperparameters)

Train a model with given data and parameters

* **Parameters:**
  * **X** (*numpy.ndarray*) – Feature matrix
  * **y** (*numpy.ndarray*) – Labels
  * **model_type** (*str*) – Type of model to train
  * **hyperparameters** (*Dict* *[**str* *,* *Any* *]*) – Model hyperparameters
* **Returns:**
  Trained model pipeline
* **Return type:**
  sklearn.pipeline.Pipeline

### train_model.main()

Main training script

## Sentence Encoding

Sentence Transformer Encoder for Entity Resolution
Provides semantic embeddings for entity matching using pre-trained models

### *class* sentence_encoder.SentenceEncoder(model_name='all-MiniLM-L6-v2')

Bases: `object`

Wrapper for sentence transformer models optimized for entity resolution

* **Parameters:**
  **model_name** (*str*)

#### encode(texts, batch_size=32)

Encode texts into semantic embeddings

* **Parameters:**
  * **texts** (*List* *[**str* *]*) – List of text strings to encode
  * **batch_size** (*int*) – Batch size for processing
* **Returns:**
  numpy array of embeddings
* **Return type:**
  numpy.ndarray

#### encode_single(text)

Encode a single text string

* **Parameters:**
  **text** (*str*) – Text string to encode
* **Returns:**
  numpy array embedding
* **Return type:**
  numpy.ndarray

#### find_similar(query, candidates, top_k=5)

Find most similar texts from candidates

* **Parameters:**
  * **query** (*str*) – Query text
  * **candidates** (*List* *[**str* *]*) – List of candidate texts
  * **top_k** (*int*) – Number of top results to return
* **Returns:**
  List of (index, similarity_score) tuples
* **Return type:**
  *List*[tuple]

#### get_model_info()

Get information about the loaded model

* **Returns:**
  Dictionary with model information
* **Return type:**
  dict

#### similarity(text1, text2)

Calculate semantic similarity between two texts

* **Parameters:**
  * **text1** (*str*) – First text
  * **text2** (*str*) – Second text
* **Returns:**
  Cosine similarity score between 0 and 1
* **Return type:**
  float

### sentence_encoder.batch_entity_similarity(entity_texts, batch_size=100, model_name='all-MiniLM-L6-v2')

Process large batches of entity texts for similarity calculation

* **Parameters:**
  * **entity_texts** (*List* *[**str* *]*) – List of entity text representations
  * **batch_size** (*int*) – Batch size for processing
  * **model_name** (*str*) – Name of the sentence transformer model
* **Returns:**
  Embeddings array
* **Return type:**
  numpy.ndarray

### sentence_encoder.calculate_similarity_matrix(texts, model_name='all-MiniLM-L6-v2')

Calculate similarity matrix for a list of texts

* **Parameters:**
  * **texts** (*List* *[**str* *]*) – List of text strings
  * **model_name** (*str*) – Name of the sentence transformer model
* **Returns:**
  Symmetric similarity matrix
* **Return type:**
  numpy.ndarray

### sentence_encoder.encode_sentences(texts, model_name='all-MiniLM-L6-v2')

Convenience function to encode sentences

* **Parameters:**
  * **texts** (*List* *[**str* *]*) – List of text strings
  * **model_name** (*str*) – Name of the sentence transformer model
* **Returns:**
  numpy array of embeddings
* **Return type:**
  numpy.ndarray

### sentence_encoder.find_duplicates(texts, threshold=0.85, model_name='all-MiniLM-L6-v2')

Find potential duplicates in a list of texts

* **Parameters:**
  * **texts** (*List* *[**str* *]*) – List of text strings
  * **threshold** (*float*) – Similarity threshold for duplicates
  * **model_name** (*str*) – Name of the sentence transformer model
* **Returns:**
  List of (index1, index2, similarity) tuples for potential duplicates
* **Return type:**
  *List*[tuple]

### sentence_encoder.get_encoder(model_name='all-MiniLM-L6-v2')

Get or create a global encoder instance

* **Parameters:**
  **model_name** (*str*) – Name of the sentence transformer model
* **Returns:**
  SentenceEncoder instance
* **Return type:**
  [*SentenceEncoder*](#sentence_encoder.SentenceEncoder)

### sentence_encoder.main()

Command line interface for the sentence encoder
