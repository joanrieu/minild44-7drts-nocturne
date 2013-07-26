all: music effects

music: music.wav music.ogg music.mp3

effects: effects.wav effects.ogg effects.mp3

LMMSFLAGS=-s 48000 -b 320 -i sincbest -x 8

%.wav: %.mmp
	lmms -r $^ -o $@ $(LMMSFLAGS)

%.ogg: %.wav
	oggenc $^

%.mp3: %.wav
	lame $^
