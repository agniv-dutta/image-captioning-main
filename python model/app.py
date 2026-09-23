from flask import Flask, request, jsonify
from tensorflow.keras.models import load_model
from PIL import Image
import numpy as np
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.applications.vgg16 import VGG16, preprocess_input
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.models import Model
import io
from caption_reader import CaptionReader
from flask_cors import CORS


app = Flask(__name__)
CORS(app)
tokenizer = CaptionReader('kaggle/captions.txt').get_tokenizer()
model = load_model('CL_FD_MODEL_V2.keras')


@app.route('/predict', methods=['POST'])
def predict():
    vgg_model = VGG16()
    vgg_model = Model(inputs=vgg_model.inputs,
                      outputs=vgg_model.layers[-2].output)
    file = request.files['file']
    if file:
        img = Image.open(io.BytesIO(file.read()))
        img = img.resize((224, 224))
        img = img.convert('RGB')
        img = np.array(img)
        img = img.reshape((1, 224, 224, 3))
        image = preprocess_input(img)
        try:
            features = vgg_model.predict(image)
        except UnicodeEncodeError as e:
            print(e)
        text = predict_caption(model, features, tokenizer)
        text = " ".join(text.split(" ")[1:-1])
        return jsonify({'result': text})

    return jsonify({'result': 'not a valid image'})


def idx_to_word(integer, tokenizer):
    for word, index in tokenizer.word_index.items():
        if index == integer:
            return word
    return None


def predict_caption(model, image, tokenizer, max_length=35):
    in_text = 'startseq'
    for i in range(max_length):
        sequence = tokenizer.texts_to_sequences([in_text])[0]
        sequence = pad_sequences([sequence], maxlen=max_length)
        yhat = model.predict([image, sequence], verbose=0)
        yhat = np.argmax(yhat)
        word = idx_to_word(yhat, tokenizer)
        if word is None:
            break
        in_text += " " + word
        if word == 'endseq':
            break
    return in_text


if __name__ == '__main__':
    app.run(debug=True)
