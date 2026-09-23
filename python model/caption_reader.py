import os
from tensorflow.keras.preprocessing.text import Tokenizer

class CaptionReader:
    def __init__(self, caption_file):
        self.caption_file = caption_file
    
    def get_tokenizer(self):
        with open(os.path.join(self.caption_file), 'r') as f:
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
        
        self.clean(mapping)

        all_captions = []
        for key in mapping:
            for caption in mapping[key]:
                all_captions.append(caption)


        tokenizer = Tokenizer()
        tokenizer.fit_on_texts(all_captions)
        return tokenizer

    def clean(self, mapping):
        for key, captions in mapping.items():
            for i in range(len(captions)):
                caption = captions[i]
                caption = caption.lower()
                caption = caption.replace('[^A-Za-z]', '')
                caption = caption.replace('\s+', ' ')
                caption = 'startseq ' + " ".join([word for word in caption.split() if len(word) > 1]) + ' endseq'
                captions[i] = caption