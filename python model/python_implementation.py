import os
import pickle
import numpy as np
from tensorflow.keras.applications.vgg16 import VGG16, preprocess_input
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.models import Model
from tensorflow.keras.utils import to_categorical, plot_model
from tensorflow.keras.layers import Input, LSTM, Dropout, Dense, add, Embedding

model = VGG16() 
model = Model(inputs = model.inputs, outputs = model.layers[-2].output)


features = {}
file = os.path.join('Images')

for img_name in os.listdir(file):
	print("Feature extraction started for: ",img_name)
	img_path = file + "/" + img_name
	image =  load_img(img_path, target_size = (224, 224))
	image = img_to_array(image)
	image = image.reshape((1, image.shape[0], image.shape[1], image.shape[2]))
	image = preprocess_input(image)
	feature = model.predict(image, verbose = 0)
	image_id = img_name.split('.')[0]
	features[image_id] = feature


#pickle.dump(features, open(os.path.join('features.pkl'),'wb'))

with open(os.path.join('features.pkl'),'rb') as f:
	features = pickle.load(f)

with open(os.path.join('captions.txt'), 'r') as f:
	next(f)
	captions_doc = f.read()

mapping = {}
for line in captions_doc.split('\n'):
	tokens = line.split(',')
	if len(line) < 2:
		continue
	image_id, caption = tokens[0], tokens[1:]
	image_id = image_id.split('.')[0]
	caption = " ".join(caption)
	if image_id not in mapping:
		mapping[image_id] = []
	mapping[image_id].append(caption)

def clean(mapping: dict):
	for key, captions in mapping.items():
		for i in range(len(captions)):
			caption = captions[i]
			caption = caption.lower()
			caption	= caption.replace('[^A-Za-z]','')
			caption = caption.replace('\s+', ' ')
			caption = 'startseq ' + " ".join([word for word in caption.split() if len(word) > 1]) + ' endseq'
			captions[i] = caption 
			
clean(mapping)

all_captions = []
for key in mapping:
	for caption in mapping[key]:
		all_captions.append(caption)
		
len(all_captions)

tokenizer = Tokenizer()
tokenizer.fit_on_texts(all_captions)
vocab_size = len(tokenizer.word_index) + 1

len_max = max(len(caption.split()) for caption in all_captions)

image_ids = [mapping.keys()]
split = int(len(image_ids) * 0.9)
train = image_ids[:split]
test = image_ids[split:]

# train, test, train_output, test_output = train_test_split([mapping.keys()], all_captions, train_size = 0.9)

def data_generator(data_keys, mapping, features, tokenizer, len_max, vocab_size, batch_size):
	X1, X2, y = list(), list(), list()
	n = 0
	while 1:
		for key in data_keys:
			n += 1
			captions = mapping[key]
			for caption in captions:
				seq = tokenizer.texts_to_sequences([caption])[0]
				for i in range(1, len(seq)):
					in_seq, output = seq[:i], seq[i:]
					in_seq = pad_sequences([input], maxlen = len_max)[0]
					output = to_categorical([output], num_classes = vocab.size)[0]
					X1.append(features[key][0])
					X2.append(in_seq)
					y.append(output)
			if n == batch_size:
				X1, X2, y = np.array(X1), np.array(X2), np.array(y)
				yield {"image": X1, "text": X2}, y
				X1, X2, y = list(), list(), list()
				n = 0
	
#Model Creation
# model = keras.Sequential([
# 	Input(shape = (4096,)),
# 	Dropout(0.4),
# 	Dense(256, activation = 'relu'),
# 	Input(shape = (len_max,)),
#     se1 = Embedding(vocab_size, 256, mask_zero = True),
# 	Dropout(0.4),
# 	LSTM(256),
#     Dense(256, activation = 'relu'),
# 	Dense(vocab_size, activation = 'softmax')
# ])

inputs1 = Input(shape = (4096,), name = "image")
fe1 = Dropout(0.4)(inputs1)
fe2 = Dense(256, activation = 'relu')(fe1)			

inputs2 = Input(shape = (len_max,), name = "text")
se1 = Embedding(vocab_size, 256, mask_zero = True)(inputs2)
se2 = Dropout(0.4)(se1)
se3 = LSTM(256)(se2)

decoder1 = add([fe2, se3])
decoder2 = Dense(256, activation = 'relu')(decoder1)
outputs = Dense(vocab_size, activation = 'softmax')(decoder2)

model = Model(inputs = [inputs1, inputs2], outputs = outputs)
model.compile(loss = 'categorical_crossentropy', optimizer = 'adam')

plot_model(model, show_shapes = True)

#training

epochs = 50
batch_size = 32
steps = len(train) // batch_size
for i in range(epochs):
	generator = data_generator(train, mapping, features, tokenizer, len_max, vocab_size, batch_size)
	model.fit(generator, epochs = 1, steps_per_epoch = steps, verbose = 1)

def index_to_word(integer: int, tokenizer):
	for word, index in tokenizer.word_index.items():
		if index == integer:
			return word
		return None
	
def predict_caption(model, image, tokenizer, len_max):
	in_text = 'starseq'
	for i in range(len_max):
		sequence = tokenizer.text_to_sequences([in_text])[0]
		sequence = pad_sequences([sequence], len_max) 
		next_text = model.predict([image, sequence], verbose = 0)
		next_text = np.argmax(next_text)
		word = index_to_word(next_text, tokenizer)
		if word is None or word == 'endseq':
			break
		in_text += " " + word
	return in_text

from nltk.translate.bleu_score import corpus_bleu
actual, predicted = list(), list()
for key in test:
	captions = mapping[key]
	y_predict = predict_caption(model, features[key], tokenizer, len_max)
	actual_captions = [caption.split() for caption in captions]
	y_pred = y_pred.split()
	actual.append(actual_captions)
	predicted.append(y_pred)

print("BLEU-1 : %f" % corpus_bleu(actual, predicted, weights = (1.0, 0, 0, 0)))
print("BLEU-2 : %f" % corpus_bleu(actual, predicted, weights = (0.5, 0.5, 0, 0)))


from PIL import Image
import matplotlib.pyplot as plt
def generate_caption(image_name):
	image_id = image_name.split(',')[0]
	img_path = os.path.join('Images', image_name)
	image = Image.open(img_path)
	captions = mapping[image_id]
	print('----------------------Actual------------------------')
	for caption in captions:
		print(caption)
	y_pred = predict_caption(model, features[image_id], tokenizer, len_max)
	print('---------------------Predicted-----------------------')
	print(y_pred)
	plt.imshow(image)

generate_caption("1001773457_577c3a7d70.jpg")


