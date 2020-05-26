import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IFindProducts {
  id: string;
}

interface IProduct {
  id: string;
  price: number;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exists');
    }

    const parsedProductIds = products.map(product => {
      const findProduct: IFindProducts = {
        id: product.id,
      };
      return findProduct;
    });

    const listProducts = await this.productsRepository.findAllById(
      parsedProductIds,
    );

    if (listProducts.length !== products.length) {
      throw new AppError('Product does not exists');
    }

    const parsedQuantities = listProducts
      .map(product => {
        const quantityRequest = products.find(
          productRequest => productRequest.id === product.id,
        );
        return (
          product.quantity - (quantityRequest ? quantityRequest.quantity : 0)
        );
      })
      .filter(quantity => quantity < 0);

    if (parsedQuantities.length > 0) {
      throw new AppError('Insufficient quantities');
    }

    const parsedProducts = listProducts.map(product => {
      const quantityRequest = products.find(
        productRequest => productRequest.id === product.id,
      );
      const iProduct: IProduct = {
        id: product.id,
        quantity: quantityRequest ? quantityRequest.quantity : product.quantity,
        price: product.price,
      };
      return iProduct;
    });

    const order = await this.ordersRepository.create({
      customer,
      products: parsedProducts.map(product => {
        return {
          product_id: product.id,
          price: product.price,
          quantity: product.quantity,
        };
      }),
    });

    await this.productsRepository.updateQuantity(products);

    delete order?.customer_id;

    return order;
  }
}

export default CreateOrderService;
