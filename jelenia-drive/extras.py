import json,sys
d=json.load(open(sys.argv[1]))
L=[('Ratusz · Plac Ratuszowy',53052,10075,'JG'),('Dworzec PKP Jelenia Góra',57413,10300,'JG'),('Dworzec PKS',52402,9156,'JG'),
('Galeria Sudecka',58811,4093,'JG'),('Teatr im. Norwida',53995,11234,'JG'),('Wzgórze Krzywoustego',51069,8131,'JG'),
('Lotnisko Jelenia Góra',63176,11567,'JG'),('Stadion Miejski',57131,9651,'JG'),('Osiedle Zabobrze',55597,6003,'JG'),
('Karkonoska Akademia',52005,6642,'JG'),('Szpital Wojewódzki',59157,6830,'JG'),
('Termy Cieplickie',42698,23926,'CP'),('Pałac Schaffgotschów',42549,22265,'CP'),('Pałac Sobieszów',34073,28134,'CP'),
('Zamek Chojnik',34960,32153,'CP'),('Stawy Podgórzyńskie',45073,27776,'CP'),
('Huta Julia',23853,26908,'PI'),('Dworzec Piechowice',24385,26468,'PI'),
('Dworzec Szklarska Poręba Górna',9772,32538,'SZ'),('Centrum Szklarskiej Poręby',9794,33343,'SZ'),
('Wyciąg na Szrenicę',10106,41099,'SZ'),('Wodospad Szklarki',17038,33498,'SZ'),('Wodospad Kamieńczyka',5354,38593,'SZ'),
('Dom Hauptmannów',12034,30414,'SZ'),('Muzeum Mineralogiczne',11253,37446,'SZ'),('Dinopark',14432,30697,'SZ')]
d['landmarks']=[{'n':n,'x':x,'y':y,'town':t} for n,x,y,t in L]
d['towns']=[{'n':'Jelenia Góra','x':53052,'y':10075},{'n':'Cieplice','x':42698,'y':23926},{'n':'Piechowice','x':24385,'y':26468},{'n':'Szklarska Poręba','x':9794,'y':33343}]
d['cams']=['Wolności','Jeleniogórska']
d['poi'].append(['place','Jelenia Góra · Śródmieście',53300,9800])
json.dump(d,open(sys.argv[2],'w'),ensure_ascii=False,separators=(',',':'))
