-- Gym Tracker: populate equipment_ar/equipment_en for the default seeded exercises.
-- (0006 only added the columns; they were left null for every existing row.)
-- Plain UPDATEs, safe to re-run.

update public.exercises set equipment_ar = 'بار', equipment_en = 'Barbell' where name_en = 'Barbell Squat';
update public.exercises set equipment_ar = 'جهاز', equipment_en = 'Machine' where name_en = 'Leg Press';
update public.exercises set equipment_ar = 'بار', equipment_en = 'Barbell' where name_en = 'Deadlift';
update public.exercises set equipment_ar = 'بار', equipment_en = 'Barbell' where name_en = 'Romanian Deadlift';
update public.exercises set equipment_ar = 'دمبل', equipment_en = 'Dumbbell' where name_en = 'Lunges';
update public.exercises set equipment_ar = 'دمبل', equipment_en = 'Dumbbell' where name_en = 'Bulgarian Split Squat';
update public.exercises set equipment_ar = 'جهاز', equipment_en = 'Machine' where name_en = 'Leg Extension';
update public.exercises set equipment_ar = 'جهاز', equipment_en = 'Machine' where name_en = 'Leg Curl';
update public.exercises set equipment_ar = 'بار', equipment_en = 'Barbell' where name_en = 'Hip Thrust';
update public.exercises set equipment_ar = 'بار', equipment_en = 'Barbell' where name_en = 'Bench Press';
update public.exercises set equipment_ar = 'بار', equipment_en = 'Barbell' where name_en = 'Incline Bench Press';
update public.exercises set equipment_ar = 'وزن الجسم', equipment_en = 'Bodyweight' where name_en = 'Push Up';
update public.exercises set equipment_ar = 'دمبل', equipment_en = 'Dumbbell' where name_en = 'Dumbbell Fly';
update public.exercises set equipment_ar = 'بار', equipment_en = 'Barbell' where name_en = 'Overhead Press';
update public.exercises set equipment_ar = 'دمبل', equipment_en = 'Dumbbell' where name_en = 'Lateral Raise';
update public.exercises set equipment_ar = 'بار', equipment_en = 'Barbell' where name_en = 'Barbell Row';
update public.exercises set equipment_ar = 'كيبل', equipment_en = 'Cable' where name_en = 'Lat Pulldown';
update public.exercises set equipment_ar = 'وزن الجسم', equipment_en = 'Bodyweight' where name_en = 'Pull Up';
update public.exercises set equipment_ar = 'كيبل', equipment_en = 'Cable' where name_en = 'Seated Cable Row';
update public.exercises set equipment_ar = 'كيبل', equipment_en = 'Cable' where name_en = 'Face Pull';
update public.exercises set equipment_ar = 'دمبل', equipment_en = 'Dumbbell' where name_en = 'Bicep Curl';
update public.exercises set equipment_ar = 'دمبل', equipment_en = 'Dumbbell' where name_en = 'Hammer Curl';
update public.exercises set equipment_ar = 'كيبل', equipment_en = 'Cable' where name_en = 'Tricep Pushdown';
update public.exercises set equipment_ar = 'بار', equipment_en = 'Barbell' where name_en = 'Skull Crusher';
update public.exercises set equipment_ar = 'وزن الجسم', equipment_en = 'Bodyweight' where name_en = 'Plank';
update public.exercises set equipment_ar = 'وزن الجسم', equipment_en = 'Bodyweight' where name_en = 'Crunch';
update public.exercises set equipment_ar = 'وزن الجسم', equipment_en = 'Bodyweight' where name_en = 'Leg Raise';
update public.exercises set equipment_ar = 'وزن الجسم', equipment_en = 'Bodyweight' where name_en = 'Russian Twist';
update public.exercises set equipment_ar = 'جهاز', equipment_en = 'Machine' where name_en = 'Calf Raise';
update public.exercises set equipment_ar = 'جهاز', equipment_en = 'Machine' where name_en = 'Hyperextension (Back Extension)';
update public.exercises set equipment_ar = 'دمبل', equipment_en = 'Dumbbell' where name_en = 'Farmer''s Carry';
update public.exercises set equipment_ar = 'وزن الجسم', equipment_en = 'Bodyweight' where name_en = 'Box Jump';
update public.exercises set equipment_ar = 'حبال مقاومة', equipment_en = 'Battle Ropes' where name_en = 'Battle Ropes';
update public.exercises set equipment_ar = 'كيتلبل', equipment_en = 'Kettlebell' where name_en = 'Kettlebell Swing';
update public.exercises set equipment_ar = 'وزن الجسم', equipment_en = 'Bodyweight' where name_en = 'Burpee';
