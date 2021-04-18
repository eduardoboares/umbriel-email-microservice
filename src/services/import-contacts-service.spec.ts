import Contact from '@schemas/contact';
import Tag from '@schemas/tag';
import ImportContactsService from '@services/import-contacts-service';
import mongoose from 'mongoose';
import { Readable } from 'stream';

describe('Import', () => {
    beforeAll(async () => {
        if (!process.env.MONGO_URL) {
            throw new Error('MongoDB server not initialized');
        }

        await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await Contact.deleteMany({});
        await Tag.deleteMany({});
    });

    it('Should be able to import new contacts', async () => {
        const contactsFileStream = Readable.from([
            'eduardop.boares@gmail.com\n',
            'maria@gmail.com\n',
            'joao@gmail.com\n'
        ]);

        const importContacts = new ImportContactsService();

        await importContacts.run(contactsFileStream, ['Students', 'Class A']);

        const createdTags = await Tag.find({}).lean();

        expect(createdTags).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ title: 'Students' }),
                expect.objectContaining({ title: 'Class A' })
            ])
        );

        const createdTagsIds = createdTags.map(tag => tag._id);

        const createdContacts = await Contact.find({}).lean();

        expect(createdContacts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    email: 'eduardop.boares@gmail.com',
                    tags: createdTagsIds
                }),
                expect.objectContaining({
                    email: 'maria@gmail.com',
                    tags: createdTagsIds
                }),
                expect.objectContaining({
                    email: 'joao@gmail.com',
                    tags: createdTagsIds
                })
            ])
        );
    });

    it('should not recreate tags that already exist', async () => {
        const contactsFileStream = Readable.from([
            'eduardop.boares@gmail.com\n',
            'maria@gmail.com\n',
            'joao@gmail.com\n'
        ]);

        const importContacts = new ImportContactsService();

        await Tag.create({ title: 'Students' });

        await importContacts.run(contactsFileStream, ['Students', 'Class A']);

        const createdTags = await Tag.find({}).lean();

        expect(createdTags).toEqual([
            expect.objectContaining({ title: 'Students' }),
            expect.objectContaining({ title: 'Class A' })
        ])
    });

    it('should not recreate contacts that already exist', async () => {
        const contactsFileStream = Readable.from([
            'eduardop.boares@gmail.com\n',
            'maria@gmail.com\n',
            'joao@gmail.com\n'
        ]);

        const importContacts = new ImportContactsService();

        const tag = await Tag.create({ title: 'Students' });
        await Contact.create({ email: 'eduardop.boares@gmail.com', tags: [tag._id] });

        await importContacts.run(contactsFileStream, ['Class A']);

        const contacts = await Contact.find({
            email: 'eduardop.boares@gmail.com'
        })
            .populate('tags')
            .lean();

        expect(contacts.length).toBe(1);

        expect(contacts[0].tags).toEqual([
            expect.objectContaining({ title: 'Students' }),
            expect.objectContaining({ title: 'Class A' })
        ]);
    });
});